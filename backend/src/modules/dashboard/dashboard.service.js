// src/modules/dashboard/dashboard.service.js
// Couche service fine : le calcul est entierement delegue au repository SQL.

import { fetchDashboardStats } from "./dashboard.repository.js";

export async function getDashboardStats() {
  return fetchDashboardStats();
}
