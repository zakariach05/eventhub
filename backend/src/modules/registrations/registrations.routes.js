// src/modules/registrations/registrations.routes.js

import { Router } from "express";
import { auth }        from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { validate }    from "../../middlewares/validate.js";
import {
  createRegistrationSchema,
  patchRegistrationStatusSchema,
  listRegistrationsQuerySchema,
} from "./registrations.schema.js";
import {
  listRegistrationsController,
  createRegistrationController,
  patchRegistrationStatusController,
} from "./registrations.controller.js";

const router = Router();

// Toutes les routes necessitent une authentification
router.use(auth);

// GET /api/registrations?eventId=&status=&page=&limit=
router.get(
  "/",
  validate(listRegistrationsQuerySchema, "query"),
  listRegistrationsController
);

// POST /api/registrations — admin et staff
router.post(
  "/",
  requireRole("admin", "staff"),
  validate(createRegistrationSchema),
  createRegistrationController
);

// PATCH /api/registrations/:id/status — admin et staff
router.patch(
  "/:id/status",
  requireRole("admin", "staff"),
  validate(patchRegistrationStatusSchema),
  patchRegistrationStatusController
);

export default router;
