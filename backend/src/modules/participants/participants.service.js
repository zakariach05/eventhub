// src/modules/participants/participants.service.js
// Logique metier : unicite email insensible a la casse, blocage DELETE si inscriptions actives.

import { AppError } from "../../utils/AppError.js";
import {
  findParticipants,
  findParticipantById,
  findParticipantByEmail,
  createParticipant,
  updateParticipant,
  deleteParticipant,
  countActiveRegistrationsByParticipant,
} from "./participants.repository.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Leve 409 si l email est deja pris (hors l ID exclu en cas de PUT). */
async function assertEmailUnique(email, excludeId = null) {
  const existing = await findParticipantByEmail(email);
  if (existing && existing.id !== excludeId) {
    throw new AppError(
      `L email "${email}" est deja utilise par un autre participant`,
      409,
      "DUPLICATE_EMAIL"
    );
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function listParticipants({ search, page, limit }) {
  const { rows, total } = await findParticipants({ search, page, limit });
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

export async function getParticipantById(id) {
  const participant = await findParticipantById(id);
  if (!participant) throw new AppError("Participant introuvable", 404, "NOT_FOUND");
  return participant;
}

export async function createNewParticipant(data) {
  // Verification d unicite insensible a la casse avant l INSERT
  await assertEmailUnique(data.email);
  return createParticipant(data);
}

export async function updateExistingParticipant(id, data) {
  const participant = await findParticipantById(id);
  if (!participant) throw new AppError("Participant introuvable", 404, "NOT_FOUND");

  // Si l email change, verifier l unicite (insensible a la casse, hors soi-meme)
  if (data.email !== undefined) {
    await assertEmailUnique(data.email, id);
  }

  return updateParticipant(id, data);
}

export async function removeParticipant(id) {
  const participant = await findParticipantById(id);
  if (!participant) throw new AppError("Participant introuvable", 404, "NOT_FOUND");

  // Interdit si inscriptions actives (pending ou confirmed)
  const activeCount = await countActiveRegistrationsByParticipant(id);
  if (activeCount > 0) {
    throw new AppError(
      `Impossible de supprimer ce participant : il a ${activeCount} inscription(s) active(s)`,
      409,
      "HAS_ACTIVE_REGISTRATIONS"
    );
  }

  await deleteParticipant(id);
}
