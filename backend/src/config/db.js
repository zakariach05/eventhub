// src/config/db.js
// Pool de connexions PostgreSQL partage dans toute l application.
// On importe env apres validation pour garantir que DATABASE_URL est definie.

import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,              // connexions simultanées max
  idleTimeoutMillis:  30_000,
  connectionTimeoutMillis: 5_000,
});

// Verification de la connexion au demarrage
pool.connect((err, client, release) => {
  if (err) {
    console.error("[DB] Impossible de se connecter a PostgreSQL :", err.message);
    process.exit(1);
  }
  console.log("[DB] Connexion PostgreSQL etablie");
  release();
});
