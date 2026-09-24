// src/middlewares/errorHandler.js
// Handler centralise : formate toutes les erreurs dans le schema uniforme.
// En production, masque la stack trace des erreurs non operationnelles.

import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Erreur Zod remontee par le middleware validate()
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: {
        code:    "VALIDATION_ERROR",
        message: "Donnees invalides",
        details: err.errors.map((e) => ({
          field:   e.path.join("."),
          message: e.message,
        })),
      },
    });
  }

  // Violation de contrainte unique PostgreSQL (ex: doublon email)
  if (err.code === "23505") {
    return res.status(409).json({
      error: {
        code:    "DUPLICATE_ENTRY",
        message: "Cette ressource existe deja",
        details: [],
      },
    });
  }

  // Erreur metier (AppError)
  if (err.isOperational) {
    return res.status(err.status).json({
      error: {
        code:    err.code,
        message: err.message,
        details: err.details ?? [],
      },
    });
  }

  // Erreur systeme inattendue
  console.error("[ERROR]", err);
  return res.status(500).json({
    error: {
      code:    "INTERNAL_ERROR",
      message: "Une erreur interne est survenue",
      details: env.NODE_ENV === "development" ? [err.message] : [],
    },
  });
}
