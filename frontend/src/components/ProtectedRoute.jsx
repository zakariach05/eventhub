// src/components/ProtectedRoute.jsx
// Redirige vers /login si non authentifie.
// Usage : <ProtectedRoute roles={["admin"]}> ou sans roles (tous roles)

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Restriction par role si specifie
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
