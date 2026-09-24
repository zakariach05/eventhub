// src/modules/participants/participants.routes.js

import { Router } from "express";
import { auth }        from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { validate }    from "../../middlewares/validate.js";
import {
  createParticipantSchema,
  updateParticipantSchema,
  searchParticipantsQuerySchema,
} from "./participants.schema.js";
import {
  listParticipantsController,
  getParticipantController,
  createParticipantController,
  updateParticipantController,
  deleteParticipantController,
} from "./participants.controller.js";

const router = Router();

// Toutes les routes participants necessitent une authentification
router.use(auth);

// GET /api/participants?search=&page=&limit=
router.get(
  "/",
  validate(searchParticipantsQuerySchema, "query"),
  listParticipantsController
);

// GET /api/participants/:id
router.get("/:id", getParticipantController);

// POST /api/participants — admin et staff
router.post(
  "/",
  requireRole("admin", "staff"),
  validate(createParticipantSchema),
  createParticipantController
);

// PUT /api/participants/:id — admin et staff
router.put(
  "/:id",
  requireRole("admin", "staff"),
  validate(updateParticipantSchema),
  updateParticipantController
);

// DELETE /api/participants/:id — admin uniquement
router.delete(
  "/:id",
  requireRole("admin"),
  deleteParticipantController
);

export default router;
