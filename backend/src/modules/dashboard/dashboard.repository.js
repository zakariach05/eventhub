// src/modules/dashboard/dashboard.repository.js
// Requetes SQL optimisees pour le dashboard.
// Toutes les statistiques sont calculees cote DB en un minimum d aller-retours.

import { pool } from "../../config/db.js";

/**
 * Charge toutes les statistiques du dashboard en 2 requetes SQL :
 *  - Requete 1 : compteurs globaux (totalEvents, publishedEvents, registrationsToday)
 *  - Requete 2 : top 5 evenements par taux de remplissage (pending + confirmed)
 *
 * Index utilises :
 *  - idx_events_status              → COUNT FILTER (WHERE status = 'published')
 *  - idx_registrations_created_at   → COUNT FILTER (WHERE created_at::date = CURRENT_DATE)
 *  - idx_registrations_event_status → sous-requete top5 (event_id, status IN ...)
 */
export async function fetchDashboardStats() {
  // ---------------------------------------------------------------------------
  // Requete 1 : compteurs globaux — une seule passe sur chaque table
  // COUNT(*) sur events : scan sequentiel petit (table courte)
  // COUNT FILTER sur registrations filtre via idx_registrations_created_at
  // ---------------------------------------------------------------------------
  const globalResult = await pool.query(`
    SELECT
      -- Nombre total d evenements (toutes statuts confondus)
      (SELECT COUNT(*)
         FROM events)                                          AS total_events,

      -- Evenements publies uniquement — utilise idx_events_status
      (SELECT COUNT(*)
         FROM events
        WHERE status = 'published')                           AS published_events,

      -- Inscriptions crees aujourd hui (UTC) — utilise idx_registrations_created_at
      (SELECT COUNT(*)
         FROM registrations
        WHERE created_at >= CURRENT_DATE
          AND created_at <  CURRENT_DATE + INTERVAL '1 day') AS registrations_today
  `);

  const global = globalResult.rows[0];

  // ---------------------------------------------------------------------------
  // Requete 2 : top 5 evenements publies par taux de remplissage
  // Seules les inscriptions pending + confirmed comptent.
  // utilise idx_registrations_event_status (event_id, status)
  // ---------------------------------------------------------------------------
  const top5Result = await pool.query(`
    SELECT
      e.id,
      e.title,
      e.max_participants,
      COUNT(r.id) FILTER (WHERE r.status IN ('pending','confirmed')) AS registered_count,
      ROUND(
        COUNT(r.id) FILTER (WHERE r.status IN ('pending','confirmed'))::numeric
        / NULLIF(e.max_participants, 0) * 100,
        2
      )                                                              AS fill_rate
    FROM events e
    LEFT JOIN registrations r ON r.event_id = e.id
    WHERE e.status = 'published'
    GROUP BY e.id, e.title, e.max_participants
    ORDER BY fill_rate DESC NULLS LAST, registered_count DESC
    LIMIT 5
  `);

  return {
    totalEvents:        Number(global.total_events),
    publishedEvents:    Number(global.published_events),
    registrationsToday: Number(global.registrations_today),
    top5Events: top5Result.rows.map((row) => ({
      id:              row.id,
      title:           row.title,
      maxParticipants: row.max_participants,
      registeredCount: Number(row.registered_count),
      fillRate:        Number(row.fill_rate ?? 0),
    })),
  };
}
