// src/middlewares/validate.js
// Valide req.body, req.params ou req.query avec un schema Zod.
// En cas d echec, lance une ZodError rattrapee par errorHandler.

export const validate = (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // On laisse errorHandler formater la ZodError
      return next(result.error);
    }
    // Remplace la source par les donnees parsees/coercees par Zod
    req[source] = result.data;
    next();
  };
