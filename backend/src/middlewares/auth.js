// src/middlewares/auth.js
// Verifie le JWT Bearer dans l en-tete Authorization.
// Injecte req.user = { id, email, role } pour les middlewares suivants.

import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Token d authentification manquant", 401, "UNAUTHORIZED"));
  }

  const token = header.slice(7); // retire "Bearer "
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id:    payload.sub,
      email: payload.email,
      role:  payload.role,
    };
    next();
  } catch {
    // Ne pas distinguer token expire vs invalide pour eviter l enumeration
    next(new AppError("Token invalide ou expire", 401, "UNAUTHORIZED"));
  }
}
