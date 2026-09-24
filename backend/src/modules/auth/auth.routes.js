// src/modules/auth/auth.routes.js

import { Router } from "express";
import { z } from "zod";
import { validate }          from "../../middlewares/validate.js";
import { auth }              from "../../middlewares/auth.js";
import { loginController, getMeController } from "./auth.controller.js";

const router = Router();

const loginSchema = z.object({
  email:    z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

// POST /api/auth/login — rate limit applique dans app.js sur ce prefix
router.post("/login", validate(loginSchema), loginController);

// GET /api/auth/me
router.get("/me", auth, getMeController);

export default router;
