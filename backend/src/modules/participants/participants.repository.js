// src/modules/participants/participants.repository.js
// Requetes SQL parametrees — aucune concatenation de chaine.

import { pool } from "../../config/db.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function toParticipant(row) {
  if (!row) return null;
  return {
    id:        row.id,
    fullName:  row.full_name,
    email:     row.email,
    phone:     row.phone,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Requetes
// ---------------------------------------------------------------------------

/**
 * Liste paginee avec recherche ILIKE sur full_name OU email.
 * La recherche est insensible a la casse cote SQL (ILIKE).
 */
export async function findParticipants({ search, page, limit }) {
  const values  = [];
  let   idx     = 1;
  let   where   = "";

  if (search) {
    // Parametre ILIKE — pas de concatenation SQL
    where = `WHERE p.full_name ILIKE $${idx} OR lower(p.email) ILIKE lower($${idx})`;
    values.push(`%${search}%`);
    idx++;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM participants p ${where}`,
    values
  );
  const total  = Number(countResult.rows[0].total);
  const offset = (page - 1) * limit;

  const { rows } = await pool.query(
    `SELECT p.*
       FROM participants p
      ${where}
      ORDER BY p.full_name ASC
      LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  return { rows: rows.map(toParticipant), total };
}

/** Detail d un participant par ID. */
export async function findParticipantById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM participants WHERE id = $1 LIMIT 1`,
    [id]
  );
  return toParticipant(rows[0]);
}

/**
 * Recherche par email (insensible a la casse) via l index lower(email).
 * Utilise pour la verification de doublon.
 */
export async function findParticipantByEmail(email) {
  const { rows } = await pool.query(
    `SELECT * FROM participants WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  return toParticipant(rows[0]);
}

/** Cree un participant. */
export async function createParticipant({ fullName, email, phone }) {
  const { rows } = await pool.query(
    `INSERT INTO participants (full_name, email, phone)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [fullName, email, phone ?? null]
  );
  return toParticipant(rows[0]);
}

/** Mise a jour partielle d un participant. */
export async function updateParticipant(id, fields) {
  const setClauses = [];
  const values     = [];
  let   idx        = 1;

  const fieldMap = {
    fullName: "full_name",
    email:    "email",
    phone:    "phone",
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${col} = $${idx++}`);
      values.push(fields[key]);
    }
  }

  if (setClauses.length === 0) return findParticipantById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE participants
        SET ${setClauses.join(", ")}
      WHERE id = $${idx}
      RETURNING *`,
    values
  );
  return toParticipant(rows[0]);
}

/** Supprime un participant. Retourne true si supprime, false si introuvable. */
export async function deleteParticipant(id) {
  const { rowCount } = await pool.query(
    `DELETE FROM participants WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

/**
 * Compte les inscriptions actives (pending + confirmed) du participant.
 * Utilise avant DELETE pour bloquer si des inscriptions existent.
 */
export async function countActiveRegistrationsByParticipant(participantId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt
       FROM registrations
      WHERE participant_id = $1
        AND status IN ('pending','confirmed')`,
    [participantId]
  );
  return Number(rows[0].cnt);
}
