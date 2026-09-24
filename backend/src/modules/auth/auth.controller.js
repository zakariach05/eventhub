// src/modules/auth/auth.controller.js
// Responsabilite unique : lire la requete, appeler le service, renvoyer la reponse.

import { asyncHandler } from "../../utils/asyncHandler.js";
import { login, getMe } from "./auth.service.js";

export const loginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await login(email, password);
  res.status(200).json(result);
});

export const getMeController = asyncHandler(async (req, res) => {
  const user = await getMe(req.user.id);
  res.status(200).json(user);
});
