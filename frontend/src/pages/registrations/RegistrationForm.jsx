// src/pages/registrations/RegistrationForm.jsx
// Inscrit un participant a un evenement.
// ?eventId=UUID pre-selectionne l evenement via le query param.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api    from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import Spinner from "../../components/Spinner.jsx";
import Badge  from "../../components/Badge.jsx";

export default function RegistrationForm() {
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const preselectedEvent  = searchParams.get("eventId") ?? "";

  const [events,       setEvents]       = useState([]);
  const [participants, setParticipants] = useState([]);
  const [evLoad,       setEvLoad]       = useState(true);
  const [pLoad,        setPLoad]        = useState(true);

  const [eventId,       setEventId]       = useState(preselectedEvent);
  const [participantId, setParticipantId] = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState(false);

  // Charger les evenements publies
  useEffect(() => {
    api.get("/events", { params: { status:"published", limit:100 } })
      .then(({ data }) => setEvents(data.data))
      .finally(() => setEvLoad(false));
  }, []);

  // Charger les participants
  useEffect(() => {
    api.get("/participants", { params: { limit:100 } })
      .then(({ data }) => setParticipants(data.data))
      .finally(() => setPLoad(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!eventId || !participantId) {
      setError("Veuillez selectionner un evenement et un participant.");
      return;
    }
    setSaving(true); setError("");
    try {
      await api.post("/registrations", { eventId, participantId });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error?.message ?? "Erreur lors de l inscription");
    } finally { setSaving(false); }
  }

  if (evLoad || pLoad) return <Spinner />;

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">Inscription enregistree !</h2>
        <p className="text-gray-500 text-sm">Le participant a bien ete inscrit a l evenement.</p>
        <div className="flex justify-center gap-3 mt-4">
          <Button variant="secondary" onClick={() => navigate("/events")}>
            Liste des evenements
          </Button>
          <Button onClick={() => { setSuccess(false); setParticipantId(""); setError(""); }}>
            Nouvelle inscription
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Inscrire un participant</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Evenement */}
        <div className="flex flex-col gap-1">
          <label htmlFor="eventId" className="text-sm font-medium text-gray-700">
            Evenement *
          </label>
          <select
            id="eventId"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Choisir un evenement --</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.registeredCount}/{ev.maxParticipants} places)
              </option>
            ))}
          </select>
          {events.length === 0 && (
            <p className="text-xs text-amber-600">Aucun evenement publie disponible.</p>
          )}
        </div>

        {/* Participant */}
        <div className="flex flex-col gap-1">
          <label htmlFor="participantId" className="text-sm font-medium text-gray-700">
            Participant *
          </label>
          <select
            id="participantId"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Choisir un participant --</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} — {p.email}
              </option>
            ))}
          </select>
        </div>

        {/* Erreur API */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" loading={saving} disabled={!eventId || !participantId}>
            Inscrire
          </Button>
        </div>
      </form>
    </div>
  );
}
