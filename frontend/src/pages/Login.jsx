// src/pages/Login.jsx
// Page de connexion : gestion loading / erreur API / redirection post-login.

import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Input  from "../components/Input.jsx";
import Button from "../components/Button.jsx";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate                   = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // Deja connecte -> rediriger
  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      // Affiche le message d erreur retourne par l API
      setError(
        err.response?.data?.error?.message ?? "Erreur de connexion, veuillez reessayer."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* En-tete */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🗓</div>
          <h1 className="text-2xl font-bold text-gray-900">EventHub</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion d evenements</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@eventhub.com"
            required
            autoFocus
          />

          <Input
            id="password"
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {/* Message d erreur API */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full mt-1">
            Se connecter
          </Button>
        </form>

        {/* Comptes de test */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">Comptes de test :</p>
          <p>admin@eventhub.com / Admin123!</p>
          <p>staff@eventhub.com / Staff123!</p>
        </div>
      </div>
    </div>
  );
}
