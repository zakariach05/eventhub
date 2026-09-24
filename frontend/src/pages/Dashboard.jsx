// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api     from "../api/axios.js";
import Spinner from "../components/Spinner.jsx";
import Badge   from "../components/Badge.jsx";

function StatCard({ label, value, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    green:  "bg-green-50  text-green-700  border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  return (
    <div className={`rounded-xl border p-6 flex flex-col gap-1 ${colors[color]}`}>
      <span className="text-3xl font-bold">{value ?? "—"}</span>
      <span className="text-sm font-medium opacity-80">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    api.get("/dashboard/stats")
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.response?.data?.error?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-red-700">{error}</div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Compteurs globaux */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total événements"      value={stats.totalEvents}        color="indigo" />
        <StatCard label="Événements publiés"    value={stats.publishedEvents}    color="green"  />
        <StatCard label="Inscriptions aujourd'hui" value={stats.registrationsToday} color="yellow" />
      </div>

      {/* Top 5 événements */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Top 5 — Taux de remplissage
        </h2>

        {stats.top5Events.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun événement publié pour le moment.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Événement</th>
                  <th className="px-4 py-3 text-right">Inscrits</th>
                  <th className="px-4 py-3 text-right">Capacité</th>
                  <th className="px-4 py-3 text-right">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.top5Events.map((ev, i) => {
                  const pct = ev.fillRate;
                  const barColor = pct >= 90 ? "bg-red-400" : pct >= 60 ? "bg-yellow-400" : "bg-green-400";
                  return (
                    <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-mono text-xs w-4">{i + 1}</span>
                          <Link
                            to={`/events/${ev.id}`}
                            className="font-medium text-indigo-700 hover:underline"
                          >
                            {ev.title}
                          </Link>
                        </div>
                        {/* Barre de progression */}
                        <div className="mt-1 ml-6 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{ev.registeredCount}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{ev.maxParticipants}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${pct >= 90 ? "text-red-600" : pct >= 60 ? "text-yellow-600" : "text-green-600"}`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raccourcis */}
      <div className="flex gap-4 flex-wrap">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Voir tous les événements →
        </Link>
        <Link
          to="/participants"
          className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Gérer les participants →
        </Link>
      </div>
    </div>
  );
}
