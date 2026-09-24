// src/app.js
// Configure Express : securite, middlewares globaux, routes, handler d erreur.
// Separe de server.js pour faciliter les tests (supertest importe app sans lancer le serveur).

import express    from "express";
import helmet     from "helmet";
import cors       from "cors";
import rateLimit  from "express-rate-limit";
import { env }    from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";

// Modules de routes
import authRoutes          from "./modules/auth/auth.routes.js";
import eventsRoutes        from "./modules/events/events.routes.js";
import participantsRoutes  from "./modules/participants/participants.routes.js";
import registrationsRoutes from "./modules/registrations/registrations.routes.js";

const app = express();

// ---------------------------------------------------------------------------
// Securite HTTP
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// Rate limiting sur le login uniquement (evite le brute-force)
// ---------------------------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      10,              // 10 tentatives par fenetre
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    error: {
      code:    "TOO_MANY_REQUESTS",
      message: "Trop de tentatives, reessayez dans 15 minutes",
      details: [],
    },
  },
});
app.use("/api/auth/login", loginLimiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api/auth",          authRoutes);
app.use("/api/events",        eventsRoutes);
app.use("/api/participants",  participantsRoutes);
app.use("/api/registrations", registrationsRoutes);

// Health check (pas d auth requise)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Route inconnue
app.use((req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route introuvable", details: [] },
  });
});

// ---------------------------------------------------------------------------
// Handler d erreur centralise (doit etre le DERNIER middleware)
// ---------------------------------------------------------------------------
app.use(errorHandler);

export default app;
