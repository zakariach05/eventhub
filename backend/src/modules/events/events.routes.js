// src/modules/events/events.routes.js

import { Router } from "express";
import { auth }         from "../../middlewares/auth.js";
import { requireRole }  from "../../middlewares/requireRole.js";
import { validate }     from "../../middlewares/validate.js";
import {
  createEventSchema,
  updateEventSchema,
  patchStatusSchema,
  listEventsQuerySchema,
} from "./events.schema.js";
import {
  listEventsController,
  getEventController,
  createEventController,
  updateEventController,
  patchEventStatusController,
} from "./events.controller.js";

const router = Router();

// Toutes les routes events necessitent une authentification
router.use(auth);

// GET /api/events?status=&date=&page=&limit=
router.get(
  "/",
  validate(listEventsQuerySchema, "query"),
  listEventsController
);

// GET /api/events/:id
router.get("/:id", getEventController);

// POST /api/events — admin et staff
router.post(
  "/",
  requireRole("admin", "staff"),
  validate(createEventSchema),
  createEventController
);

// PUT /api/events/:id — admin et staff
router.put(
  "/:id",
  requireRole("admin", "staff"),
  validate(updateEventSchema),
  updateEventController
);

// PATCH /api/events/:id/status — admin et staff
router.patch(
  "/:id/status",
  requireRole("admin", "staff"),
  validate(patchStatusSchema),
  patchEventStatusController
);

export default router;
