// src/modules/dashboard/dashboard.controller.js

import { asyncHandler }    from "../../utils/asyncHandler.js";
import { getDashboardStats } from "./dashboard.service.js";

export const getDashboardStatsController = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();
  res.status(200).json(stats);
});
