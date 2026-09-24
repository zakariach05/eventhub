// src/modules/registrations/registrations.controller.js

import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  listRegistrations,
  getRegistrationById,
  createRegistration,
  changeRegistrationStatus,
} from "./registrations.service.js";

export const listRegistrationsController = asyncHandler(async (req, res) => {
  const result = await listRegistrations(req.query);
  res.status(200).json(result);
});

export const createRegistrationController = asyncHandler(async (req, res) => {
  const registration = await createRegistration(req.body);
  res.status(201).json(registration);
});

export const patchRegistrationStatusController = asyncHandler(async (req, res) => {
  const registration = await changeRegistrationStatus(req.params.id, req.body.status);
  res.status(200).json(registration);
});
