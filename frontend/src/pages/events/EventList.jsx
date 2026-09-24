// src/pages/events/EventList.jsx
// Liste des evenements avec filtres statut/date + pagination + actions selon le role.

import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate }               from "react-router-dom";
import api        from "../../api/axios.js";
import { useAuth } from "../../context/AuthContext.jsx";
import Spinner    from "../../components/Spinner.jsx";
import Badge      from "../../components/Badge.jsx";
import Button     from "../../components/Button.jsx";
import Pagination from "../../components/Pagination.jsx";
import Modal      from "../../components/Modal.jsx";

const STATUSES = ["", "draft", "published", "cancelled"];

export default function EventList() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const canEdit     = ["admin", "staff"].includes(user?.role);

  const [events,    setEvents]    = useState([]);
  const [pagination,setPagination]= useState({ page:1, totalPages:1, total:0 });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  // Filtres
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate,   setFilterDate]   = useState("");
  const [page,         setPage]         = useState(1);

  // Modal de confirmation statut
  const [modal, setModal] = useState({ open: false, event: null, newStatus: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState("");

  const fetchEvents = useCallback(() => {
    setLoading(true);
    setError("");
    const params = { page, limit: 10 };
    if (filterStatus) params.status = filterStatus;
    if (filterDate)   params.date   = filterDate;

    api.get("/events", { params })
      .then(({ data }) => {
        setEvents(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.response?.data?.error?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [page, filterStatus, filterDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Quand les filtres changent, revenir en page 1
  function handleFilterChange(setter) {
    return (val) => { setter(val); setPage(1); };
  }

  async function confirmStatusChange() {
    setActionLoading(true);
    setActionError("");
    try {
      await api.patch(`/events/${modal.event.id}/status`, { status: modal.newStatus });
      setModal({ open: false, event: null, newStatus: "" });
      fetchEvents();
    } catch (err) {
      setActionError(err.response?.data?.error?.message ?? "Erreur lors du changement de statut");
    } finally {
      setActionLoading(false);
    }
  }

  function openModal(event, newStatus) {
    setActionError("");
    setModal({ open: true, event, newStatus });
  }

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Événements</h1>
        {canEdit && (
          <Button onClick={() => navigate("/events/new")}>+ Créer un événement</Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl p-4">
        <select
          value={filterStatus}
          onChange={(e) => handleFilterChange(setFilterStatus)(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === "" ? "Tous les statuts" : s}</option>
          ))}
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => handleFilterChange(setFilterDate)(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {(filterStatus || filterDate) && (
          <button
            onClick={() => { handleFilterChange(setFilterStatus)(""); handleFilterChange(setFilterDate)(""); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Réinitialiser
          </button>
        )}

        <span className="ml-auto text-sm text-gray-500 self-center">
          {pagination.total} événement{pagination.total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Etats */}
      {loading && <Spinner />}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Liste vide */}
      {!loading && !error && events.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">Aucun événement trouvé</p>
          {canEdit && (
            <Button onClick={() => navigate("/events/new")} variant="secondary">
              Créer le premier événement
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && events.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Titre</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Lieu</th>
                <th className="px-4 py-3 text-center">Inscrits</th>
                <th className="px-4 py-3 text-center">Statut</th>
                {canEdit && <th className="px-4 py-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to={`/events/${ev.id}`}
                      className="font-medium text-indigo-700 hover:underline"
                    >
                      {ev.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(ev.eventDate).toLocaleDateString("fr-FR", {
                      day:"2-digit", month:"short", year:"numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{ev.location ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${ev.registeredCount >= ev.maxParticipants ? "text-red-600" : "text-gray-700"}`}>
                      {ev.registeredCount}/{ev.maxParticipants}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={ev.status} />
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {/* Bouton Editer — uniquement sur evenements non annules */}
                        {ev.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(`/events/${ev.id}/edit`)}
                          >
                            Éditer
                          </Button>
                        )}
                        {/* Bouton Publier */}
                        {ev.status === "draft" && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => openModal(ev, "published")}
                          >
                            Publier
                          </Button>
                        )}
                        {/* Bouton Annuler */}
                        {ev.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openModal(ev, "cancelled")}
                          >
                            Annuler
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />

      {/* Modal de confirmation */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, event: null, newStatus: "" })}
        title={modal.newStatus === "published" ? "Publier l'événement" : "Annuler l'événement"}
      >
        <p className="text-gray-700 text-sm mb-4">
          {modal.newStatus === "published"
            ? `Publier "${modal.event?.title}" ? Il sera visible et ouvert aux inscriptions.`
            : `Annuler "${modal.event?.title}" ? Toutes ses inscriptions seront également annulées. Cette action est irréversible.`
          }
        </p>
        {actionError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setModal({ open: false, event: null, newStatus: "" })}
          >
            Annuler
          </Button>
          <Button
            variant={modal.newStatus === "published" ? "success" : "danger"}
            loading={actionLoading}
            onClick={confirmStatusChange}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
