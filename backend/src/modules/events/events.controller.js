// src/modules/events/events.controller.js
// Responsabilite unique : lire req, appeler le service, ecrire res.

import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  listEvents,
  getEventById,
  createNewEvent,
  updateExistingEvent,
  changeEventStatus,
} from "./events.service.js";

export const listEventsController = asyncHandler(async (req, res) => {
  const result = await listEvents(req.query);
  res.status(200).json(result);
});

export const getEventController = asyncHandler(async (req, res) => {
  const event = await getEventById(req.params.id);
  res.status(200).json(event);
});

export const createEventController = asyncHandler(async (req, res) => {
  const event = await createNewEvent(req.body, req.user.id);
  res.status(201).json(event);
});

export const updateEventController = asyncHandler(async (req, res) => {
  const event = await updateExistingEvent(req.params.id, req.body);
  res.status(200).json(event);
});

export const patchEventStatusController = asyncHandler(async (req, res) => {
  const event = await changeEventStatus(req.params.id, req.body.status);
  res.status(200).json(event);
});
