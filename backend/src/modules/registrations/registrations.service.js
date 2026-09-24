// src/modules/registrations/registrations.service.js
// Couche service : transforme les erreurs brutes du repository en AppError uniformes.

import { AppError } from "../../utils/AppError.js";
import {
  findRegistrations,
  findRegistrationById,
  createRegistrationTx,
  updateRegistrationStatusTx,
} from "./registrations.repository.js";

// ---------------------------------------------------------------------------
// Helper : convertit les erreurs lancees dans les transactions en AppError
// Les erreurs sont des objets Error enrichis avec { status, code } dans le repo.
// ---------------------------------------------------------------------------
function rethrowAsAppError(err) {
  if (err instanceof AppError) throw err;
  // Erreur PG 23505 : doublon UNIQUE (event_id, participant_id) — filet de securite
  if (err.code === "23505") {
    throw new AppError(
      "Ce participant est deja inscrit a cet evenement",
      409,
      "DUPLICATE_REGISTRATION"
    );
  }
  // Erreurs metier lancees dans le repository avec { status, code }
  if (err.status && err.code) {
    throw new AppError(err.message, err.status, err.code);
  }
  // Erreur systeme : la relancer telle quelle pour le errorHandler global
  throw err;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function listRegistrations({ eventId, status, page, limit }) {
  const { rows, total } = await findRegistrations({ eventId, status, page, limit });
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRegistrationById(id) {
  const reg = await findRegistrationById(id);
  if (!reg) throw new AppError("Inscription introuvable", 404, "NOT_FOUND");
  return reg;
}

export async function createRegistration({ eventId, participantId }) {
  try {
    return await createRegistrationTx({ eventId, participantId });
  } catch (err) {
    rethrowAsAppError(err);
  }
}

export async function changeRegistrationStatus(id, newStatus) {
  try {
    return await updateRegistrationStatusTx(id, newStatus);
  } catch (err) {
    rethrowAsAppError(err);
  }
}
