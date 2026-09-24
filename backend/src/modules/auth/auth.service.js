// src/modules/auth/auth.service.js
// Logique metier : verification du mot de passe, creation du JWT.

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { findUserByEmail, findUserById } from "./auth.repository.js";

// Message generique — ne pas distinguer "email inconnu" vs "mauvais mot de passe"
const INVALID_CREDENTIALS = "Email ou mot de passe incorrect";

function signToken(user) {
  return jwt.sign(
    { email: user.email, role: user.role },
    env.JWT_SECRET,
    {
      subject:   user.id,
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
}

export async function login(email, password) {
  const user = await findUserByEmail(email);

  // bcrypt.compare meme si user est null pour eviter les timing attacks
  const hash       = user?.password_hash ?? "$2b$12$invalidhashfortimingatk000000000000000000000";
  const isValid    = await bcrypt.compare(password, hash);

  if (!user || !isValid) {
    throw new AppError(INVALID_CREDENTIALS, 401, "INVALID_CREDENTIALS");
  }

  const token = signToken(user);
  return {
    token,
    user: {
      id:       user.id,
      fullName: user.full_name,
      email:    user.email,
      role:     user.role,
    },
  };
}

export async function getMe(userId) {
  const user = await findUserById(userId);
  if (!user) throw new AppError("Utilisateur introuvable", 404, "NOT_FOUND");
  return {
    id:        user.id,
    fullName:  user.full_name,
    email:     user.email,
    role:      user.role,
    createdAt: user.created_at,
  };
}
