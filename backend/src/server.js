// src/server.js
// Point d entree : demarre le serveur HTTP.
// app.js est importe ici seulement, ce qui permet aux tests supertest
// d importer app.js sans demarrer le serveur.

import app from "./app.js";
import { env } from "./config/env.js";

const PORT = Number(env.PORT);

app.listen(PORT, () => {
  console.log(`[SERVER] EventHub API en ecoute sur http://localhost:${PORT}`);
  console.log(`[SERVER] Environnement : ${env.NODE_ENV}`);
});
