// src/pages/events/EventForm.jsx
// Formulaire creation ET edition d evenement (mode determine par la presence de :id).

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api    from "../../api/axios.js";
import Input  from "../../components/Input.jsx";
import Button from "../../components/Button.jsx";
import Spinner from "../../components/Spinner.jsx";

export default function EventForm() {
  const { id }   = useParams();          // undefined = creation
  const isEdit   = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title:           "",
    description:     "",
    location:        "",
    eventDate:       "",
    maxParticipants: "",
  });
  const [loading,  setLoading]  = useState(isEdit); // charge les donnees en mode edit
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState("");

  // Charger l evenement en mode edition
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/events/${id}`)
      .then(({ data }) => {
        setForm({
          title:           data.title ?? "",
          description:     data.description ?? "",
          location:        data.location ?? "",
          // Convertir en format datetime-local (YYYY-MM-DDTHH:mm)
          eventDate:       data.eventDate
            ? new Date(data.eventDate).toISOString().slice(0, 16)
            : "",
          maxParticipants: String(data.maxParticipants ?? ""),
        });
      })
      .catch((err) => setApiError(err.response?.data?.error?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const errs = {};
    if (!form.title.trim())        errs.title           = "Le titre est requis";
    if (!form.eventDate)           errs.eventDate       = "La date est requise";
    if (!form.maxParticipants)     errs.maxParticipants = "La capacite est requise";
    if (Number(form.maxParticipants) < 1)
                                   errs.maxParticipants = "Doit etre superieure a 0";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    setApiError("");

    const payload = {
      title:           form.title.trim(),
      description:     form.description.trim() || undefined,
      location:        form.location.trim()    || undefined,
      eventDate:       new Date(form.eventDate).toISOString(),
      maxParticipants: Number(form.maxParticipants),
    };

    try {
      if (isEdit) {
        await api.put(`/events/${id}`, payload);
      } else {
        const { data } = await api.post("/events", payload);
        navigate(`/events/${data.id}`);
        return;
      }
      navigate(`/events/${id}`);
    } catch (err) {
      // Afficher le detail des erreurs Zod si disponibles
      const errData = err.response?.data?.error;
      if (errData?.details?.length > 0) {
        const fieldErrors = {};
        errData.details.forEach(({ field, message }) => {
          fieldErrors[field] = message;
        });
        setErrors(fieldErrors);
      } else {
        setApiError(errData?.message ?? "Une erreur est survenue");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate(isEdit ? `/events/${id}` : "/events")}
          className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {isEdit ? "Modifier l'événement" : "Créer un événement"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <Input
          id="title"
          name="title"
          label="Titre *"
          value={form.title}
          onChange={handleChange}
          error={errors.title}
          placeholder="Ex : Conférence React 2026"
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            placeholder="Description de l'événement..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <Input
          id="location"
          name="location"
          label="Lieu"
          value={form.location}
          onChange={handleChange}
          placeholder="Ex : Paris — Palais des Congrès"
        />

        <Input
          id="eventDate"
          name="eventDate"
          label="Date et heure *"
          type="datetime-local"
          value={form.eventDate}
          onChange={handleChange}
          error={errors.eventDate}
        />

        <Input
          id="maxParticipants"
          name="maxParticipants"
          label="Capacité maximale *"
          type="number"
          min={1}
          value={form.maxParticipants}
          onChange={handleChange}
          error={errors.maxParticipants}
          placeholder="50"
        />

        {apiError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(isEdit ? `/events/${id}` : "/events")}
          >
            Annuler
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? "Enregistrer" : "Créer l'événement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
