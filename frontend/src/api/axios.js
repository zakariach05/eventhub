// src/api/axios.js
// Instance axios partagee :
//  - baseURL depuis la variable d environnement Vite
//  - Interceptor request : injecte le token JWT depuis localStorage
//  - Interceptor response : redirige vers /login sur 401

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

// --- Request interceptor : ajout du Bearer token ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor : gestion globale du 401 ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Redirection sans React Router (accessible hors contexte composant)
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
