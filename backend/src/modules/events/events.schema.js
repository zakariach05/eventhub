// src/modules/events/events.schema.js
// Schemas Zod pour la validation des requetes events.

import { z } from "zod";

export const createEventSchema = z.object({
  title:           z.string().min(1, "Titre requis").max(255),
  description:     z.string().optional(),
  location:        z.string().max(255).optional(),
  eventDate:       z.string().datetime({ message: "eventDate doit etre une date ISO 8601" }),
  maxParticipants: z.number({ invalid_type_error: "maxParticipants doit etre un nombre" })
                    .int()
                    .positive("maxParticipants doit etre > 0"),
});

export const updateEventSchema = z.object({
  title:           z.string().min(1).max(255).optional(),
  description:     z.string().optional(),
  location:        z.string().max(255).optional(),
  eventDate:       z.string().datetime({ message: "eventDate doit etre une date ISO 8601" }).optional(),
  maxParticipants: z.number().int().positive("maxParticipants doit etre > 0").optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Au moins un champ est requis pour la mise a jour" }
);

export const patchStatusSchema = z.object({
  status: z.enum(["draft", "published", "cancelled"], {
    errorMap: () => ({ message: "Statut invalide. Valeurs : draft, published, cancelled" }),
  }),
});

export const listEventsQuerySchema = z.object({
  status: z.enum(["draft", "published", "cancelled"]).optional(),
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format date attendu : YYYY-MM-DD").optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(10),
});
