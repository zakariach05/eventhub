// src/modules/registrations/registrations.repository.js
// Toutes les requetes SQL parametrees du module registrations.

import { pool } from "../../config/db.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function toRegistration(row) {
  if (!row) return null;
  return {
    id:              row.id,
    eventId:         row.event_id,
    eventTitle:      row.event_title,
    participantId:   row.participant_id,
    participantName: row.participant_name,
    participantEmail:row.participant_email,
    status:          row.status,
    createdAt:       row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Requetes de lecture
// ---------------------------------------------------------------------------

/**
 * Liste paginee avec jointures participant + evenement.
 * Filtres optionnels : eventId, status.
 */
export async function findRegistrations({ eventId, status, page, limit }) {
  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (eventId) {
    conditions.push(`r.event_id = $${idx++}`);
    values.push(eventId);
  }
  if (status) {
    conditions.push(`r.status = $${idx++}`);
    values.push(status);
  }

  const where  = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
       FROM registrations r
      ${where}`,
    values
  );
  const total = Number(countResult.rows[0].total);

  const { rows } = await pool.query(
    `SELECT
        r.id,
        r.event_id,
        e.title       AS event_title,
        r.participant_id,
        p.full_name   AS participant_name,
        p.email       AS participant_email,
        r.status,
        r.created_at
       FROM registrations r
       JOIN events       e ON e.id = r.event_id
       JOIN participants p ON p.id = r.participant_id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  return { rows: rows.map(toRegistration), total };
}

/** Detail d une inscription par ID. */
export async function findRegistrationById(id, client = pool) {
  const { rows } = await client.query(
    `SELECT
        r.id,
        r.event_id,
        e.title       AS event_title,
        r.participant_id,
        p.full_name   AS participant_name,
        p.email       AS participant_email,
        r.status,
        r.created_at
       FROM registrations r
       JOIN events       e ON e.id = r.event_id
       JOIN participants p ON p.id = r.participant_id
      WHERE r.id = $1
      LIMIT 1`,
    [id]
  );
  return toRegistration(rows[0]);
}

// ---------------------------------------------------------------------------
// Requetes transactionnelles
// ---------------------------------------------------------------------------

/**
 * Cree une inscription dans une TRANSACTION avec SELECT ... FOR UPDATE sur l evenement.
 *
 * Regles verifiees dans la transaction :
 *  1. L evenement existe et est publie (sinon 400)
 *  2. Le participant existe (sinon 404)
 *  3. Inscription doublon (sinon 409) — on anticipe aussi l erreur PG 23505
 *  4. Capacite non depassee : COUNT pending+confirmed < max_participants (sinon 409)
 *
 * Le FOR UPDATE pose un verrou exclusif sur la ligne evenement,
 * eliminant les race conditions lors d inscriptions simultanees.
 */
export async function createRegistrationTx({ eventId, participantId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // --- Verrouillage de l evenement pour eviter les race conditions ---
    const { rows: evRows } = await client.query(
      `SELECT id, status, max_participants
         FROM events
        WHERE id = $1
        FOR UPDATE`,
      [eventId]
    );
    const event = evRows[0];

    // Regle 1 : evenement existant et publie
    if (!event) {
      throw Object.assign(new Error("Evenement introuvable"), { status: 404, code: "NOT_FOUND" });
    }
    if (event.status !== "published") {
      throw Object.assign(
        new Error(`Impossible de s inscrire a un evenement en statut "${event.status}"`),
        { status: 400, code: "EVENT_NOT_PUBLISHED" }
      );
    }

    // Regle 2 (verification prealable du doublon avant INSERT pour un message clair)
    const { rows: dupRows } = await client.query(
      `SELECT id FROM registrations
        WHERE event_id = $1 AND participant_id = $2
        LIMIT 1`,
      [eventId, participantId]
    );
    if (dupRows.length > 0) {
      throw Object.assign(
        new Error("Ce participant est deja inscrit a cet evenement"),
        { status: 409, code: "DUPLICATE_REGISTRATION" }
      );
    }

    // Regle 3 : capacite
    const { rows: cntRows } = await client.query(
      `SELECT COUNT(*) AS cnt
         FROM registrations
        WHERE event_id = $1
          AND status IN ('pending','confirmed')`,
      [eventId]
    );
    const activeCount = Number(cntRows[0].cnt);
    if (activeCount >= event.max_participants) {
      throw Object.assign(
        new Error(`Evenement complet (${activeCount}/${event.max_participants} places occupees)`),
        { status: 409, code: "EVENT_FULL" }
      );
    }

    // Verification existence participant
    const { rows: pRows } = await client.query(
      `SELECT id FROM participants WHERE id = $1 LIMIT 1`,
      [participantId]
    );
    if (!pRows[0]) {
      throw Object.assign(new Error("Participant introuvable"), { status: 404, code: "NOT_FOUND" });
    }

    // INSERT — le UNIQUE (event_id, participant_id) protege contre les doublons concurrents
    const { rows: regRows } = await client.query(
      `INSERT INTO registrations (event_id, participant_id)
       VALUES ($1, $2)
       RETURNING *`,
      [eventId, participantId]
    );

    await client.query("COMMIT");

    // Requete de relecture avec les jointures pour la reponse complete
    const full = await findRegistrationById(regRows[0].id, pool);
    return full;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Change le statut d une inscription dans une TRANSACTION.
 * En cas de reactivation (cancelled -> pending|confirmed),
 * reverification de la capacite et du statut publie de l evenement.
 */
export async function updateRegistrationStatusTx(id, newStatus) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verrouiller la ligne d inscription
    const { rows: regRows } = await client.query(
      `SELECT r.id, r.event_id, r.participant_id, r.status
         FROM registrations r
        WHERE r.id = $1
        FOR UPDATE`,
      [id]
    );
    const reg = regRows[0];
    if (!reg) {
      throw Object.assign(new Error("Inscription introuvable"), { status: 404, code: "NOT_FOUND" });
    }

    const isReactivation = reg.status === "cancelled" && newStatus !== "cancelled";

    if (isReactivation) {
      // Regle 6 : reverification evenement publie + capacite
      const { rows: evRows } = await client.query(
        `SELECT status, max_participants FROM events WHERE id = $1 FOR UPDATE`,
        [reg.event_id]
      );
      const event = evRows[0];

      if (event.status !== "published") {
        throw Object.assign(
          new Error(`Impossible de reactivater : l evenement est "${event.status}"`),
          { status: 400, code: "EVENT_NOT_PUBLISHED" }
        );
      }

      const { rows: cntRows } = await client.query(
        `SELECT COUNT(*) AS cnt
           FROM registrations
          WHERE event_id = $1
            AND status IN ('pending','confirmed')
            AND id != $2`,
        [reg.event_id, id]
      );
      const activeCount = Number(cntRows[0].cnt);
      if (activeCount >= event.max_participants) {
        throw Object.assign(
          new Error(`Evenement complet (${activeCount}/${event.max_participants} places)`),
          { status: 409, code: "EVENT_FULL" }
        );
      }
    }

    const { rows: updated } = await client.query(
      `UPDATE registrations SET status = $1 WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    await client.query("COMMIT");

    // Relecture avec jointures
    const full = await findRegistrationById(updated[0].id, pool);
    return full;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
