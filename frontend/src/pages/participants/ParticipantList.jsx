// src/pages/participants/ParticipantList.jsx
// CRUD complet + recherche avec debounce (300ms) sur full_name / email.

import { useEffect, useState, useCallback, useRef } from "react";
import api        from "../../api/axios.js";
import { useAuth } from "../../context/AuthContext.jsx";
import Spinner    from "../../components/Spinner.jsx";
import Button     from "../../components/Button.jsx";
import Input      from "../../components/Input.jsx";
import Modal      from "../../components/Modal.jsx";
import Badge      from "../../components/Badge.jsx";
import Pagination from "../../components/Pagination.jsx";

const EMPTY_FORM = { fullName:"", email:"", phone:"" };

export default function ParticipantList() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin";
  const canEdit   = ["admin","staff"].includes(user?.role);

  const [participants, setParticipants] = useState([]);
  const [pagination,   setPagination]   = useState({ page:1, totalPages:1, total:0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [page,         setPage]         = useState(1);

  // Recherche avec debounce
  const [searchInput,  setSearchInput]  = useState("");
  const [search,       setSearch]       = useState("");
  const debounceRef = useRef(null);

  function handleSearchInput(val) {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  }

  // Modal edition / creation
  const [modal,     setModal]     = useState({ open:false, mode:"create", data:null });
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [formErrs,  setFormErrs]  = useState({});
  const [formLoad,  setFormLoad]  = useState(false);
  const [formErr,   setFormErr]   = useState("");

  // Modal suppression
  const [delModal,  setDelModal]  = useState({ open:false, participant:null });
  const [delLoad,   setDelLoad]   = useState(false);
  const [delErr,    setDelErr]    = useState("");

  const fetchParticipants = useCallback(() => {
    setLoading(true); setError("");
    const params = { page, limit:10 };
    if (search) params.search = search;
    api.get("/participants", { params })
      .then(({ data }) => { setParticipants(data.data); setPagination(data.pagination); })
      .catch((err) => setError(err.response?.data?.error?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  function openCreate() {
    setForm(EMPTY_FORM); setFormErrs({}); setFormErr("");
    setModal({ open:true, mode:"create", data:null });
  }
  function openEdit(p) {
    setForm({ fullName: p.fullName, email: p.email, phone: p.phone ?? "" });
    setFormErrs({}); setFormErr("");
    setModal({ open:true, mode:"edit", data:p });
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrs((prev) => ({ ...prev, [name]: "" }));
  }

  function validateForm() {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = "Nom requis";
    if (!form.email.trim())    errs.email    = "Email requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email invalide";
    if (form.phone && !/^[+\d\s\-()]{6,20}$/.test(form.phone)) errs.phone = "Format invalide";
    return errs;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrs(errs); return; }

    setFormLoad(true); setFormErr("");
    const payload = {
      fullName: form.fullName.trim(),
      email:    form.email.trim(),
      phone:    form.phone.trim() || null,
    };
    try {
      if (modal.mode === "create") {
        await api.post("/participants", payload);
      } else {
        await api.put(`/participants/${modal.data.id}`, payload);
      }
      setModal({ open:false, mode:"create", data:null });
      fetchParticipants();
    } catch (err) {
      const errData = err.response?.data?.error;
      if (errData?.details?.length > 0) {
        const fe = {};
        errData.details.forEach(({ field, message }) => { fe[field] = message; });
        setFormErrs(fe);
      } else {
        setFormErr(errData?.message ?? "Erreur");
      }
    } finally { setFormLoad(false); }
  }

  async function handleDelete() {
    setDelLoad(true); setDelErr("");
    try {
      await api.delete(`/participants/${delModal.participant.id}`);
      setDelModal({ open:false, participant:null });
      fetchParticipants();
    } catch (err) {
      setDelErr(err.response?.data?.error?.message ?? "Erreur de suppression");
    } finally { setDelLoad(false); }
  }

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
        {canEdit && <Button onClick={openCreate}>+ Ajouter un participant</Button>}
      </div>

      {/* Barre de recherche */}
      <div className="flex gap-3 items-center bg-white border border-gray-200 rounded-xl p-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
        </div>
        {searchInput && (
          <button
            onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Effacer
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500 self-center">
          {pagination.total} participant{pagination.total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Etats */}
      {loading && <Spinner />}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
      {!loading && !error && participants.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">{search ? "Aucun participant ne correspond a votre recherche." : "Aucun participant pour le moment."}</p>
          {canEdit && !search && <Button onClick={openCreate} variant="secondary">Ajouter le premier participant</Button>}
        </div>
      )}

      {/* Table */}
      {!loading && participants.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Telephone</th>
                <th className="px-4 py-3 text-left">Inscrit le</th>
                {canEdit && <th className="px-4 py-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{p.email}</td>
                  <td className="px-4 py-3 text-gray-500">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                          Editer
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => { setDelErr(""); setDelModal({ open:true, participant:p }); }}
                          >
                            Supprimer
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

      <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />

      {/* Modal creation / edition */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open:false, mode:"create", data:null })}
        title={modal.mode === "create" ? "Ajouter un participant" : "Modifier le participant"}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input id="fullName" name="fullName" label="Nom complet *"
            value={form.fullName} onChange={handleFormChange} error={formErrs.fullName}
            placeholder="Alice Martin" autoFocus />
          <Input id="email" name="email" label="Email *" type="email"
            value={form.email} onChange={handleFormChange} error={formErrs.email}
            placeholder="alice@example.com" />
          <Input id="phone" name="phone" label="Telephone (optionnel)"
            value={form.phone} onChange={handleFormChange} error={formErrs.phone}
            placeholder="+33 6 12 34 56 78" />
          {formErr && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formErr}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal({ open:false, mode:"create", data:null })}>
              Annuler
            </Button>
            <Button type="submit" loading={formLoad}>
              {modal.mode === "create" ? "Ajouter" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal suppression */}
      <Modal
        open={delModal.open}
        onClose={() => setDelModal({ open:false, participant:null })}
        title="Supprimer le participant"
      >
        <p className="text-sm text-gray-700 mb-4">
          Supprimer <strong>{delModal.participant?.fullName}</strong> ? Cette action est irreversible.
        </p>
        {delErr && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{delErr}</div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDelModal({ open:false, participant:null })}>Annuler</Button>
          <Button variant="danger" loading={delLoad} onClick={handleDelete}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
}
