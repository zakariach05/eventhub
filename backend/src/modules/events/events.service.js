// src/modules/events/events.service.js
// Toute la logique metier events : machine a etats, regles de capacite, pagination.

import { AppError } from "../../utils/AppError.js";
import {
  findEvents,
  findEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
  cancelEventWithRegistrations,
  countActiveRegistrations,
} from "./events.repository.js";

// ---------------------------------------------------------------------------
// Machine a etats — transitions autorisees
// ---------------------------------------------------------------------------
const ALLOWED_TRANSITIONS = {
  draft:     ["published", "cancelled"],
  published: ["cancelled"],
  cancelled: [],           // etat terminal
};

function assertTransition(current, next) {
  if (current === next) {
    throw new AppError(`L evenement est deja en statut "${next}"`, 400, "INVALID_TRANSITION");
  }
  if (!ALLOWED_TRANSITIONS[current]?.includes(next)) {
    throw new AppError(
      `Transition interdite : ${current} -> ${next}`,
      400,
      "INVALID_TRANSITION"
    );
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function listEvents({ status, date, page, limit }) {
  const { rows, total } = await findEvents({ status, date, page, limit });
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

export async function getEventById(id) {
  const event = await findEventById(id);
  if (!event) throw new AppError("Evenement introuvable", 404, "NOT_FOUND");
  return event;
}

export async function createNewEvent(data, userId) {
  return createEvent({ ...data, createdBy: userId });
}

export async function updateExistingEvent(id, data) {
  // Verifier l existence
  const event = await findEventById(id);
  if (!event) throw new AppError("Evenement introuvable", 404, "NOT_FOUND");

  // Interdit de modifier un evenement annule
  if (event.status === "cancelled") {
    throw new AppError("Impossible de modifier un evenement annule", 400, "INVALID_OPERATION");
  }

  // Regle 7 : interdire de reduire maxParticipants en dessous des inscriptions actives
  if (data.maxParticipants !== undefined) {
    const active = await countActiveRegistrations(id);
    if (data.maxParticipants < active) {
      throw new AppError(
        `Impossible de reduire la capacite en dessous des ${active} inscriptions actives`,
        400,
        "CAPACITY_CONFLICT"
      );
    }
  }

  return updateEvent(id, data);
}

export async function changeEventStatus(id, newStatus) {
  const event = await findEventById(id);
  if (!event) throw new AppError("Evenement introuvable", 404, "NOT_FOUND");

  assertTransition(event.status, newStatus);

  // Regle 4 : annulation transactionnelle avec cascade sur les inscriptions
  if (newStatus === "cancelled") {
    return cancelEventWithRegistrations(id);
  }

  return updateEventStatus(id, newStatus);
}
