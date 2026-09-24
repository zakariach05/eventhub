// src/modules/participants/participants.controller.js

import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  listParticipants,
  getParticipantById,
  createNewParticipant,
  updateExistingParticipant,
  removeParticipant,
} from "./participants.service.js";

export const listParticipantsController = asyncHandler(async (req, res) => {
  const result = await listParticipants(req.query);
  res.status(200).json(result);
});

export const getParticipantController = asyncHandler(async (req, res) => {
  const participant = await getParticipantById(req.params.id);
  res.status(200).json(participant);
});

export const createParticipantController = asyncHandler(async (req, res) => {
  const participant = await createNewParticipant(req.body);
  res.status(201).json(participant);
});

export const updateParticipantController = asyncHandler(async (req, res) => {
  const participant = await updateExistingParticipant(req.params.id, req.body);
  res.status(200).json(participant);
});

export const deleteParticipantController = asyncHandler(async (req, res) => {
  await removeParticipant(req.params.id);
  res.status(204).send();
});
