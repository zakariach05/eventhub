// src/modules/events/events.repository.js
// Toutes les requetes SQL parametrees du module events.
// Aucune concatenation de chaine, aucun secret en dur.

import { pool } from "../../config/db.js";

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/** Convertit un objet DB (snake_case) en objet API (camelCase). */
function toEvent(row) {
  if (!row) return null;
  return {
    id:              row.id,
    title:           row.title,
    description:     row.description,
    location:        row.location,
    eventDate:       row.event_date,
    maxParticipants: row.max_participants,
    status:          row.status,
    createdBy:       row.created_by,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
    ...(row.registered_count !== undefined && {
      registeredCount: Number(row.registered_count),
    }),
    ...(row.creator_name !== undefined && { creatorName: row.creator_name }),
  };
}

// ---------------------------------------------------------------------------
// Requetes
// ---------------------------------------------------------------------------

/**
 * Liste paginee avec filtres optionnels status et date (jour exact).
 * Retourne { rows, total }.
 */
export async function findEvents({ status, date, page, limit }) {
  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (status) {
    conditions.push(`e.status = $${idx++}`);
    values.push(status);
  }
  if (date) {
    // Filtre sur la journee entiere (UTC)
    conditions.push(`e.event_date::date = $${idx++}`);
    values.push(date);
  }

  const where  = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  // Compte total pour la pagination
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
       FROM events e
      ${where}`,
    values
  );
  const total = Number(countResult.rows[0].total);

  // Requete principale avec registeredCount
  const { rows } = await pool.query(
    `SELECT
        e.*,
        u.full_name AS creator_name,
        COUNT(r.id) FILTER (WHERE r.status IN ('pending','confirmed')) AS registered_count
       FROM events e
       LEFT JOIN users u        ON u.id = e.created_by
       LEFT JOIN registrations r ON r.event_id = e.id
      ${where}
      GROUP BY e.id, u.full_name
      ORDER BY e.event_date ASC
      LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  return { rows: rows.map(toEvent), total };
}

/** Detail d un seul evenement avec registeredCount. */
export async function findEventById(id) {
  const { rows } = await pool.query(
    `SELECT
        e.*,
        u.full_name AS creator_name,
        COUNT(r.id) FILTER (WHERE r.status IN ('pending','confirmed')) AS registered_count
       FROM events e
       LEFT JOIN users u         ON u.id = e.created_by
       LEFT JOIN registrations r ON r.event_id = e.id
      WHERE e.id = $1
      GROUP BY e.id, u.full_name`,
    [id]
  );
  return toEvent(rows[0]);
}

/** Cree un evenement et retourne la ligne complete. */
export async function createEvent({ title, description, location, eventDate, maxParticipants, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO events (title, description, location, event_date, max_participants, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, description ?? null, location ?? null, eventDate, maxParticipants, createdBy]
  );
  return toEvent(rows[0]);
}

/** Met a jour les champs fournis (UPDATE partiel). */
export async function updateEvent(id, fields) {
  // Construction dynamique de SET — valeurs indexees
  const setClauses = [];
  const values     = [];
  let   idx        = 1;

  const fieldMap = {
    title:           "title",
    description:     "description",
    location:        "location",
    eventDate:       "event_date",
    maxParticipants: "max_participants",
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${col} = $${idx++}`);
      values.push(fields[key]);
    }
  }

  if (setClauses.length === 0) return findEventById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE events
        SET ${setClauses.join(", ")}
      WHERE id = $${idx}
      RETURNING *`,
    values
  );
  if (!rows[0]) return null; // Le service verifie l existence en amont
  return toEvent(rows[0]);
}

/** Nombre d inscriptions actives (pending + confirmed) pour un evenement. */
export async function countActiveRegistrations(id, client = pool) {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS cnt
       FROM registrations
      WHERE event_id = $1
        AND status IN ('pending','confirmed')`,
    [id]
  );
  return Number(rows[0].cnt);
}

/**
 * Annulation transactionnelle :
 *  1. Passe l evenement a cancelled
 *  2. Passe toutes ses inscriptions a cancelled
 * Tout dans la meme transaction.
 */
export async function cancelEventWithRegistrations(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE events
          SET status = 'cancelled'
        WHERE id = $1
        RETURNING *`,
      [id]
    );

    await client.query(
      `UPDATE registrations
          SET status = 'cancelled'
        WHERE event_id = $1
          AND status != 'cancelled'`,
      [id]
    );

    await client.query("COMMIT");
    return toEvent(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Met a jour uniquement le statut (pour les transitions autres que -> cancelled). */
export async function updateEventStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE events
        SET status = $1
      WHERE id = $2
      RETURNING *`,
    [status, id]
  );
  return toEvent(rows[0]);
}
