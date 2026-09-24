// src/modules/participants/participants.schema.js

import { z } from "zod";

// Regex simple : +, chiffres, espaces, tirets, parentheses — entre 6 et 20 chars
const phoneRegex = /^[+\d\s\-()]{6,20}$/;

export const createParticipantSchema = z.object({
  fullName: z.string().min(1, "Nom requis").max(150),
  email:    z.string().email("Email invalide").max(255),
  phone:    z
    .string()
    .regex(phoneRegex, "Format de telephone invalide (ex: +33 6 12 34 56 78)")
    .optional()
    .nullable(),
});

export const updateParticipantSchema = z.object({
  fullName: z.string().min(1).max(150).optional(),
  email:    z.string().email("Email invalide").max(255).optional(),
  phone:    z
    .string()
    .regex(phoneRegex, "Format de telephone invalide")
    .optional()
    .nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Au moins un champ est requis pour la mise a jour" }
);

export const searchParticipantsQuerySchema = z.object({
  search: z.string().max(100).optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(10),
});
