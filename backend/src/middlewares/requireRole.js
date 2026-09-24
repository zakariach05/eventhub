// src/middlewares/requireRole.js
// A utiliser apres le middleware auth().
// Refuse l acces si le role de l utilisateur n est pas dans la liste autorisee.

import { AppError } from "../utils/AppError.js";

export const requireRole = (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Non authentifie", 401, "UNAUTHORIZED"));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Role requis : ${roles.join(" ou ")}`,
          403,
          "FORBIDDEN"
        )
      );
    }
    next();
  };
