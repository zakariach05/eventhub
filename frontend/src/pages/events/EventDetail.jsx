// src/pages/events/EventDetail.jsx
// Detail d un evenement : infos + liste des inscriptions + changement de statut.

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link }     from "react-router-dom";
import api        from "../../api/axios.js";
import { useAuth } from "../../context/AuthContext.jsx";
import Spinner    from "../../components/Spinner.jsx";
import Badge      from "../../components/Badge.jsx";
import Button     from "../../components/Button.jsx";
import Modal      from "../../components/Modal.jsx";
import Pagination from "../../components/Pagination.jsx";

const REG_STATUSES = ["pending", "confirmed", "cancelled"];

export default function EventDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit  = ["admin", "staff"].includes(user?.role);

  // --- Evenement ---
  const [event,   setEvent]   = useState(null);
  const [evLoad,  setEvLoad]  = useState(true);
  const [evError, setEvError] = useState("");

  // --- Inscriptions ---
  const [regs,       setRegs]       = useState([]);
  const [regPag,     setRegPag]     = useState({ page:1, totalPages:1, total:0 });
  const [regPage,    setRegPage]    = useState(1);
  const [regLoading, setRegLoading] = useState(true);
  const [regError,   setRegError]   = useState("");

  // --- Modal statut evenement ---
  const [evModal,      setEvModal]      = useState({ open:false, newStatus:"" });
  const [evActLoad,    setEvActLoad]    = useState(false);
  const [evActError,   setEvActError]   = useState("");

  // --- Modal statut inscription ---
  const [regModal,     setRegModal]     = useState({ open:false, reg:null, newStatus:"" });
  const [regActLoad,   setRegActLoad]   = useState(false);
  const [regActError,  setRegActError]  = useState("");

  // --- Chargement evenement ---
  useEffect(() => {
    setEvLoad(true);
    api.get(`/events/${id}`)
      .then(({ data }) => setEvent(data))
      .catch((err) => setEvError(err.response?.data?.error?.message ?? "Evenement introuvable"))
      .finally(() => setEvLoad(false));
  }, [id]);

  // --- Chargement inscriptions ---
  const fetchRegs = useCallback(() => {
    setRegLoading(true);
    api.get("/registrations", { params: { eventId: id, page: regPage, limit: 10 } })
      .then(({ data }) => { setRegs(data.data); setRegPag(data.pagination); })
      .catch((err) => setRegError(err.response?.data?.error?.message ?? "Erreur de chargement"))
      .finally(() => setRegLoading(false));
  }, [id, regPage]);

  useEffect(() => { fetchRegs(); }, [fetchRegs]);

  // --- Changer statut evenement ---
  async function confirmEvStatus() {
    setEvActLoad(true); setEvActError("");
    try {
      const { data } = await api.patch(`/events/${id}/status`, { status: evModal.newStatus });
      setEvent(data);
      setEvModal({ open:false, newStatus:"" });
      fetchRegs(); // les inscriptions ont peut-etre ete annulees
    } catch (err) {
      setEvActError(err.response?.data?.error?.message ?? "Erreur");
    } finally { setEvActLoad(false); }
  }

  // --- Changer statut inscription ---
  async function confirmRegStatus() {
    setRegActLoad(true); setRegActError("");
    try {
      await api.patch(`/registrations/${regModal.reg.id}/status`, { status: regModal.newStatus });
      setRegModal({ open:false, reg:null, newStatus:"" });
      fetchRegs();
      // Recharger le count de l evenement
      const { data } = await api.get(`/events/${id}`);
      setEvent(data);
    } catch (err) {
      setRegActError(err.response?.data?.error?.message ?? "Erreur");
    } finally { setRegActLoad(false); }
  }

  if (evLoad)  return <Spinner />;
  if (evError) return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-red-700">{evError}</div>
  );

  const fillPct = event.maxParticipants
    ? Math.round((event.registeredCount / event.maxParticipants) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Fil d ariane */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/events" className="hover:text-indigo-600">Evenements</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate">{event.title}</span>
      </div>

      {/* Entete evenement */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            {event.description && (
              <p className="mt-2 text-gray-600 text-sm leading-relaxed">{event.description}</p>
            )}
          </div>
          <Badge status={event.status} />
        </div>

        {/* Infos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Date</p>
            <p className="font-medium text-gray-800">
              {new Date(event.eventDate).toLocaleDateString("fr-FR", {
                weekday:"short", day:"2-digit", month:"long", year:"numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Lieu</p>
            <p className="font-medium text-gray-800">{event.location ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Capacite</p>
            <p className={`font-medium ${fillPct >= 100 ? "text-red-600" : "text-gray-800"}`}>
              {event.registeredCount} / {event.maxParticipants}
              <span className="text-gray-400 font-normal ml-1">({fillPct}%)</span>
            </p>
            <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${fillPct >= 100 ? "bg-red-400" : fillPct >= 70 ? "bg-yellow-400" : "bg-green-400"}`}
                style={{ width: `${Math.min(fillPct, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-medium mb-0.5">Cree par</p>
            <p className="font-medium text-gray-800">{event.creatorName ?? "—"}</p>
          </div>
        </div>

        {/* Actions evenement */}
        {canEdit && (
          <div className="flex gap-3 flex-wrap pt-2 border-t border-gray-100">
            {event.status !== "cancelled" && (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/events/${id}/edit`)}>
                Editer
              </Button>
            )}
            {event.status === "draft" && (
              <Button size="sm" variant="success"
                onClick={() => { setEvActError(""); setEvModal({ open:true, newStatus:"published" }); }}>
                Publier
              </Button>
            )}
            {event.status !== "cancelled" && (
              <Button size="sm" variant="danger"
                onClick={() => { setEvActError(""); setEvModal({ open:true, newStatus:"cancelled" }); }}>
                Annuler l evenement
              </Button>
            )}j
            {event.status === "published" && (
              <Button size="sm" onClick={() => navigate(`/registrations/new?eventId=${id}`)}>
                + Inscrire un participant
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Liste des inscriptions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Inscriptions
          <span className="ml-2 text-sm font-normal text-gray-400">({regPag.total})</span>
        </h2>

        {regLoading && <Spinner />}
        {regError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{regError}</div>
        )}
        {!regLoading && !regError && regs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Aucune inscription pour le moment.</p>
            {canEdit && event.status === "published" && (
              <Button className="mt-4" onClick={() => navigate(`/registrations/new?eventId=${id}`)}>
                Inscrire un participant
              </Button>
            )}
          </div>
        )}

        {!regLoading && regs.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Participant</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Inscrit le</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  {canEdit && <th className="px-4 py-3 text-center">Changer</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {regs.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{reg.participantName}</td>
                    <td className="px-4 py-3 text-gray-500">{reg.participantEmail}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(reg.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-center"><Badge status={reg.status} /></td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <select
                          value={reg.status}
                          onChange={(e) => {
                            if (e.target.value !== reg.status) {
                              setRegActError("");
                              setRegModal({ open:true, reg, newStatus: e.target.value });
                            }
                          }}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {REG_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={regPage} totalPages={regPag.totalPages} onPageChange={setRegPage} />
      </div>

      {/* Modal statut evenement */}
      <Modal
        open={evModal.open}
        onClose={() => setEvModal({ open:false, newStatus:"" })}
        title={evModal.newStatus === "published" ? "Publier l evenement" : "Annuler l evenement"}
      >
        <p className="text-sm text-gray-700 mb-4">
          {evModal.newStatus === "published"
            ? "Cet evenement sera visible et ouvert aux inscriptions."
            : "Toutes les inscriptions seront annulees. Action irreversible."}
        </p>
        {evActError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {evActError}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setEvModal({ open:false, newStatus:"" })}>Fermer</Button>
          <Button
            variant={evModal.newStatus === "published" ? "success" : "danger"}
            loading={evActLoad}
            onClick={confirmEvStatus}
          >
            Confirmer
          </Button>
        </div>
      </Modal>

      {/* Modal statut inscription */}
      <Modal
        open={regModal.open}
        onClose={() => setRegModal({ open:false, reg:null, newStatus:"" })}
        title="Changer le statut de l inscription"
      >
        <p className="text-sm text-gray-700 mb-4">
          Passer{" "}
          <strong>{regModal.reg?.participantName}</strong> de{" "}
          <Badge status={regModal.reg?.status} /> vers{" "}
          <Badge status={regModal.newStatus} /> ?
        </p>
        {regActError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {regActError}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRegModal({ open:false, reg:null, newStatus:"" })}>Annuler</Button>
          <Button loading={regActLoad} onClick={confirmRegStatus}>Confirmer</Button>
        </div>
      </Modal>
    </div>
  );
}
