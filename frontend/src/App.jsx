// src/App.jsx — routeur complet avec toutes les pages implementees

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }    from "./context/AuthContext.jsx";
import ProtectedRoute      from "./components/ProtectedRoute.jsx";
import Layout              from "./components/Layout.jsx";

import Login               from "./pages/Login.jsx";
import Dashboard           from "./pages/Dashboard.jsx";
import EventList           from "./pages/events/EventList.jsx";
import EventForm           from "./pages/events/EventForm.jsx";
import EventDetail         from "./pages/events/EventDetail.jsx";
import ParticipantList     from "./pages/participants/ParticipantList.jsx";
import RegistrationForm    from "./pages/registrations/RegistrationForm.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Route publique */}
          <Route path="/login" element={<Login />} />

          {/* Routes protegees — tous les roles */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index                   element={<Dashboard />} />
              <Route path="/events"          element={<EventList />} />
              <Route path="/events/new"      element={<EventForm />} />
              <Route path="/events/:id"      element={<EventDetail />} />
              <Route path="/events/:id/edit" element={<EventForm />} />
              <Route path="/participants"    element={<ParticipantList />} />

              {/* Inscription : accessible uniquement aux admin/staff */}
              <Route element={<ProtectedRoute roles={["admin","staff"]} />}>
                <Route path="/registrations/new" element={<RegistrationForm />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
