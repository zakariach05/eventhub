// src/modules/registrations/registrations.schema.js

import { z } from "zod";

export const createRegistrationSchema = z.object({
  eventId:       z.string().uuid("eventId doit etre un UUID valide"),
  participantId: z.string().uuid("participantId doit etre un UUID valide"),
});

export const patchRegistrationStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"], {
    errorMap: () => ({ message: "Statut invalide. Valeurs : pending, confirmed, cancelled" }),
  }),
});

export const listRegistrationsQuerySchema = z.object({
  eventId: z.string().uuid().optional(),
  status:  z.enum(["pending", "confirmed", "cancelled"]).optional(),
  page:    z.coerce.number().int().positive().default(1),
  limit:   z.coerce.number().int().positive().max(100).default(10),
});
