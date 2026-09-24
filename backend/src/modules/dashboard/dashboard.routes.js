// src/modules/dashboard/dashboard.routes.js

import { Router } from "express";
import { auth }        from "../../middlewares/auth.js";
import { getDashboardStatsController } from "./dashboard.controller.js";

const router = Router();

// GET /api/dashboard/stats — authentifie, tous les roles
router.get("/stats", auth, getDashboardStatsController);

export default router;
