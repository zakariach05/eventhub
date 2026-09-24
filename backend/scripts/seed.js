// scripts/seed.js
// Seed idempotent : vide les tables dans l ordre inverse des FK puis reinsere.
// Commande : npm run seed
// Comptes : admin@eventhub.com / Admin123!  |  staff@eventhub.com / Staff123!

import "dotenv/config";
import bcrypt           from "bcrypt";
import { randomUUID }   from "crypto";
import pg               from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// UUIDs fixes — permettent de referencer les FK sans aller-retour DB
// ---------------------------------------------------------------------------
const ID = {
  // Users
  admin:      randomUUID(),
  staff:      randomUUID(),
  // Events
  evConf:     randomUUID(),   // published — Conference React 2026    max:30
  evWorkshop: randomUUID(),   // published — Workshop Node.js         max:15
  evMeetup:   randomUUID(),   // draft     — Meetup DevOps            max:20
  evHackathon:randomUUID(),   // draft     — Hackathon IA             max:50
  evSummit:   randomUUID(),   // cancelled — Summit Cloud             max:25
  // Participants
  p1:  randomUUID(), // Alice Martin
  p2:  randomUUID(), // Bob Dupont
  p3:  randomUUID(), // Carol Rousseau
  p4:  randomUUID(), // David Lefebvre
  p5:  randomUUID(), // Emma Bernard
  p6:  randomUUID(), // Francois Petit
  p7:  randomUUID(), // Gina Moreau
  p8:  randomUUID(), // Hugo Simon
  p9:  randomUUID(), // Isabelle Laurent
  p10: randomUUID(), // Jean Dubois
};

// ---------------------------------------------------------------------------
// Helper : INSERT avec plusieurs lignes via UNNEST (parametres indexees proprement)
// ---------------------------------------------------------------------------
async function insertMany(client, table, columns, rows) {
  // rows = tableau de tableaux de valeurs
  // ex: [['Alice', 'alice@x.com'], ['Bob', 'bob@x.com']]
  if (rows.length === 0) return;
  const flat   = rows.flat();
  const nCols  = columns.length;
  const values = rows
    .map((_, ri) =>
      `(${columns.map((__, ci) => `$${ri * nCols + ci + 1}`).join(", ")})`
    )
    .join(",\n         ");

  await client.query(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n         ${values}`,
    flat
  );
}

// ---------------------------------------------------------------------------
// Seed principal
// ---------------------------------------------------------------------------
async function seed() {
  const client = await pool.connect();
  try {
    console.log("\n[SEED] Debut du seed...\n");

    // --- Nettoyage dans l ordre inverse des FK ---
    console.log("[SEED] Nettoyage des tables...");
    await client.query("DELETE FROM registrations");
    await client.query("DELETE FROM events");
    await client.query("DELETE FROM participants");
    await client.query("DELETE FROM users");
    console.log("[SEED] Tables videes.\n");

    // --- Users ---
    console.log("[SEED] Creation des utilisateurs...");
    const adminHash = await bcrypt.hash("Admin123!", BCRYPT_ROUNDS);
    const staffHash = await bcrypt.hash("Staff123!", BCRYPT_ROUNDS);

    await insertMany(client, "users", ["id","full_name","email","password_hash","role"], [
      [ID.admin, "Administrateur EventHub", "admin@eventhub.com", adminHash, "admin"],
      [ID.staff, "Staff EventHub",          "staff@eventhub.com", staffHash, "staff"],
    ]);
    console.log("  admin@eventhub.com  /  Admin123!  [admin]");
    console.log("  staff@eventhub.com  /  Staff123!  [staff]\n");

    // --- Events ---
    console.log("[SEED] Creation des evenements...");
    await insertMany(client,
      "events",
      ["id","title","description","location","event_date","max_participants","status","created_by"],
      [
        [
          ID.evConf,
          "Conference React 2026",
          "Deux jours de talks sur React 18, Server Components et le futur du frontend.",
          "Paris — Palais des Congres",
          "2026-11-15T09:00:00Z",
          30, "published", ID.admin
        ],
        [
          ID.evWorkshop,
          "Workshop Node.js Avance",
          "Formation pratique sur les streams, worker_threads et la performance Node.js.",
          "Lyon — Campus Numerique",
          "2026-11-28T09:00:00Z",
          15, "published", ID.staff
        ],
        [
          ID.evMeetup,
          "Meetup DevOps",
          "Retours d experience sur GitOps, ArgoCD et Kubernetes en production.",
          "Bordeaux — Cite du Numerique",
          "2026-12-10T18:30:00Z",
          20, "draft", ID.staff
        ],
        [
          ID.evHackathon,
          "Hackathon Intelligence Artificielle",
          "48h pour creer des solutions IA innovantes. Equipes de 3 a 5 personnes.",
          "Nantes — Station Tech",
          "2027-01-20T08:00:00Z",
          50, "draft", ID.admin
        ],
        [
          ID.evSummit,
          "Summit Cloud Europe",
          "Evenement annule. Sera reporte au prochain semestre.",
          "Marseille — Palais du Pharo",
          "2026-10-05T09:00:00Z",
          25, "cancelled", ID.admin
        ],
      ]
    );
    console.log("  [published] Conference React 2026        (max 30)");
    console.log("  [published] Workshop Node.js Avance      (max 15)");
    console.log("  [draft]     Meetup DevOps                (max 20)");
    console.log("  [draft]     Hackathon IA                 (max 50)");
    console.log("  [cancelled] Summit Cloud Europe          (max 25)\n");

    // --- Participants ---
    console.log("[SEED] Creation des participants...");
    await insertMany(client, "participants", ["id","full_name","email","phone"], [
      [ID.p1,  "Alice Martin",     "alice.martin@example.com",     "+33 6 10 11 12 13"],
      [ID.p2,  "Bob Dupont",       "bob.dupont@example.com",       "+33 6 20 21 22 23"],
      [ID.p3,  "Carol Rousseau",   "carol.rousseau@example.com",   "+33 6 30 31 32 33"],
      [ID.p4,  "David Lefebvre",   "david.lefebvre@example.com",   null],
      [ID.p5,  "Emma Bernard",     "emma.bernard@example.com",     "+33 7 50 51 52 53"],
      [ID.p6,  "Francois Petit",   "francois.petit@example.com",   "+33 6 60 61 62 63"],
      [ID.p7,  "Gina Moreau",      "gina.moreau@example.com",      null],
      [ID.p8,  "Hugo Simon",       "hugo.simon@example.com",       "+33 6 80 81 82 83"],
      [ID.p9,  "Isabelle Laurent", "isabelle.laurent@example.com", "+33 6 90 91 92 93"],
      [ID.p10, "Jean Dubois",      "jean.dubois@example.com",      null],
    ]);
    console.log("  10 participants crees.\n");

    // --- Registrations ---
    // Repartition (20 total) :
    //  evConf    (published, max 30) : 6 actives (4 confirmed + 2 pending)   — P1..P6
    //  evWorkshop(published, max 15) : 5 actives (3 confirmed + 2 pending)   — P7,P8,P9,P10,P1
    //  evSummit  (cancelled)         : 9 cancelled                           — P1..P9
    //
    // Regles respectees :
    //  - Aucune inscription sur evenements draft (evMeetup, evHackathon)
    //  - Pas de doublon (event_id, participant_id)
    //  - Capacite non depassee sur les evenements publies
    //  - evSummit cancelled → toutes ses inscriptions cancelled
    console.log("[SEED] Creation des inscriptions...");
    await insertMany(client, "registrations", ["event_id","participant_id","status"], [
      // evConf — 6 inscriptions actives
      [ID.evConf, ID.p1, "confirmed"],
      [ID.evConf, ID.p2, "confirmed"],
      [ID.evConf, ID.p3, "pending"],
      [ID.evConf, ID.p4, "confirmed"],
      [ID.evConf, ID.p5, "pending"],
      [ID.evConf, ID.p6, "confirmed"],
      // evWorkshop — 5 inscriptions actives
      [ID.evWorkshop, ID.p7,  "confirmed"],
      [ID.evWorkshop, ID.p8,  "pending"],
      [ID.evWorkshop, ID.p9,  "confirmed"],
      [ID.evWorkshop, ID.p10, "confirmed"],
      [ID.evWorkshop, ID.p1,  "pending"],
      // evSummit — 9 inscriptions cancelled (coherent avec statut evenement)
      [ID.evSummit, ID.p1, "cancelled"],
      [ID.evSummit, ID.p2, "cancelled"],
      [ID.evSummit, ID.p3, "cancelled"],
      [ID.evSummit, ID.p4, "cancelled"],
      [ID.evSummit, ID.p5, "cancelled"],
      [ID.evSummit, ID.p6, "cancelled"],
      [ID.evSummit, ID.p7, "cancelled"],
      [ID.evSummit, ID.p8, "cancelled"],
      [ID.evSummit, ID.p9, "cancelled"],
    ]);
    console.log("  evConf     : 6 inscriptions (4 confirmed, 2 pending)");
    console.log("  evWorkshop : 5 inscriptions (3 confirmed, 2 pending)");
    console.log("  evSummit   : 9 inscriptions (toutes cancelled)");
    console.log("  Total      : 20 inscriptions\n");

    // --- Recapitulatif ---
    console.log("=".repeat(57));
    console.log("  SEED TERMINE AVEC SUCCES");
    console.log("=".repeat(57));
    console.log("\n  Comptes de connexion :");
    console.log("  ┌──────────────────────────────────────┬─────────┐");
    console.log("  │ Email / Mot de passe                 │ Role    │");
    console.log("  ├──────────────────────────────────────┼─────────┤");
    console.log("  │ admin@eventhub.com  /  Admin123!     │ admin   │");
    console.log("  │ staff@eventhub.com  /  Staff123!     │ staff   │");
    console.log("  └──────────────────────────────────────┴─────────┘");
    console.log("\n  Dashboard stats apres seed :");
    console.log("  totalEvents        : 5");
    console.log("  publishedEvents    : 2");
    console.log("  registrationsToday : 20 (si execute aujourd hui)\n");

  } catch (err) {
    console.error("\n[SEED] ERREUR :", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
