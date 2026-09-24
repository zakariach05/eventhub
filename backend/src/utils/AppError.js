// src/utils/AppError.js
// Classe d erreur metier — distinguee des erreurs systeme par isOperational.

export class AppError extends Error {
  /**
   * @param {string} message  Message lisible
   * @param {number} status   Code HTTP (400, 401, 403, 404, 409…)
   * @param {string} code     Code machine ("VALIDATION_ERROR", "NOT_FOUND"…)
   * @param {Array}  details  Details optionnels (erreurs Zod, etc.)
   */
  constructor(message, status = 500, code = "INTERNAL_ERROR", details = []) {
    super(message);
    this.status        = status;
    this.code          = code;
    this.details       = details;
    this.isOperational = true;   // erreur prevue, pas un bug
    Error.captureStackTrace(this, this.constructor);
  }
}
