// src/utils/asyncHandler.js
// Enveloppe les controllers async pour propager les erreurs vers Express
// sans repeter try/catch dans chaque handler.

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
