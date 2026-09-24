// src/modules/auth/auth.repository.js
// Couche SQL : requetes parametrees uniquement.

import { pool } from "../../config/db.js";

export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, full_name, email, password_hash, role
       FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT id, full_name, email, role, created_at
       FROM users
      WHERE id = $1
      LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}
