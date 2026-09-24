// src/components/Layout.jsx
// Navbar adaptee selon le role + zone de contenu principale.

import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-indigo-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold tracking-tight hover:opacity-90">
            🗓 EventHub
          </Link>

          {/* Navigation principale */}
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link to="/"              className="hover:text-indigo-200 transition-colors">Dashboard</Link>
            <Link to="/events"        className="hover:text-indigo-200 transition-colors">Événements</Link>
            <Link to="/participants"  className="hover:text-indigo-200 transition-colors">Participants</Link>
          </div>

          {/* Utilisateur connecte */}
          <div className="flex items-center gap-4 text-sm">
            <span className="opacity-80">
              {user?.fullName}
              <span className="ml-2 bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full uppercase">
                {user?.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="bg-white text-indigo-700 px-3 py-1.5 rounded-md font-semibold hover:bg-indigo-50 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
