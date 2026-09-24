// src/config/env.js
// Valide toutes les variables d environnement au demarrage via Zod.
// Si une variable est manquante ou invalide, le processus s arrete immediatement.

import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT:           z.string().default("3000"),
  NODE_ENV:       z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL:   z.string().url("DATABASE_URL doit etre une URL valide"),
  JWT_SECRET:     z.string().min(32, "JWT_SECRET doit faire au moins 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGIN:    z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables d environnement invalides :");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
