// src/tests/registrations.test.js
// Tests d integration : doublon, complet, non publie, cascade annulation, 401/403.
// Utilise supertest sur l instance express (pas de port reseau).

import request        from "supertest";
import app            from "../app.js";
import { resetDb, closeDb, testPool, IDS } from "./setup.js";

let adminToken;
let staffToken;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function login(email, password) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return res.body.token;
}

// ---------------------------------------------------------------------------
// Cycle de vie
// ---------------------------------------------------------------------------
beforeAll(async () => {
  // Chargement initial
  await resetDb();
  adminToken = await login("admin@test.com", "Admin123!");
  staffToken = await login("staff@test.com", "Staff123!");
});

beforeEach(async () => {
  // Remise a zero entre chaque test pour l independance
  await resetDb();
  adminToken = await login("admin@test.com", "Admin123!");
  staffToken = await login("staff@test.com", "Staff123!");
});

afterAll(async () => { await closeDb(); });

// ---------------------------------------------------------------------------
// Tests 401 / 403
// ---------------------------------------------------------------------------
describe("Auth", () => {
  test("POST /registrations sans token => 401", async () => {
    const res = await request(app)
      .post("/api/registrations")
      .send({ eventId: IDS.evPublished, participantId: IDS.p2 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("DELETE /participants/:id en tant que staff => 403", async () => {
    const res = await request(app)
      .delete(`/api/participants/${IDS.p1}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// Tests Registrations — regles metier
// ---------------------------------------------------------------------------
describe("Registrations — regles metier", () => {

  test("Regle 1 : inscription sur evenement draft => 400 EVENT_NOT_PUBLISHED", async () => {
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ eventId: IDS.evDraft, participantId: IDS.p2 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EVENT_NOT_PUBLISHED");
  });

  test("Regle 1 : inscription sur evenement cancelled => 400 EVENT_NOT_PUBLISHED", async () => {
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ eventId: IDS.evCancelled, participantId: IDS.p2 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EVENT_NOT_PUBLISHED");
  });

  test("Regle 2 : doublon inscription => 409 DUPLICATE_REGISTRATION", async () => {
    // 1ere inscription
    await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ eventId: IDS.evPublished, participantId: IDS.p2 });

    // 2eme inscription meme paire => 409
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ eventId: IDS.evPublished, participantId: IDS.p2 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_REGISTRATION");
  });

  test("Regle 3 : evenement complet (1/1 place) => 409 EVENT_FULL", async () => {
    // evFull est deja rempli avec p1 dans resetDb()
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ eventId: IDS.evFull, participantId: IDS.p2 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EVENT_FULL");
  });

  test("Inscription reussie => 201 avec registrationId", async () => {
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ eventId: IDS.evPublished, participantId: IDS.p2 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("pending");
  });

  test("Regle 4 : annulation evenement cascade sur inscriptions => toutes cancelled", async () => {
    // Inscrire p2 a evPublished
    await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ eventId: IDS.evPublished, participantId: IDS.p2 });

    // Annuler l evenement
    const cancelRes = await request(app)
      .patch(`/api/events/${IDS.evPublished}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "cancelled" });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe("cancelled");

    // Verifier que toutes les inscriptions sont cancelled
    const regRes = await request(app)
      .get(`/api/registrations?eventId=${IDS.evPublished}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(regRes.status).toBe(200);
    const statuses = regRes.body.data.map((r) => r.status);
    expect(statuses.every((s) => s === "cancelled")).toBe(true);
  });

  test("Regle 6 : reactivation cancelled => verifie capacite", async () => {
    // regCancelled existe (evPublished/p3/cancelled)
    // evFull est plein mais evPublished a de la place
    const res = await request(app)
      .patch(`/api/registrations/${IDS.regCancelled}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" });
    // evPublished a de la place => 200
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("confirmed");
  });

  test("Regle 6 : reactivation sur evenement complet => 409 EVENT_FULL", async () => {
    // Creer une inscription cancelled sur evFull/p2
    // evFull est deja rempli avec p1 — on insere directement en DB
    const { rows } = await testPool.query(
      `INSERT INTO registrations (event_id,participant_id,status)
       VALUES ($1,$2,'cancelled') RETURNING id`,
      [IDS.evFull, IDS.p2]
    );
    const cancelledRegId = rows[0].id;

    const res = await request(app)
      .patch(`/api/registrations/${cancelledRegId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EVENT_FULL");
  });
});

// ---------------------------------------------------------------------------
// Tests Events — machine a etats
// ---------------------------------------------------------------------------
describe("Events — machine a etats", () => {
  test("draft -> published => 200", async () => {
    const res = await request(app)
      .patch(`/api/events/${IDS.evDraft}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "published" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("published");
  });

  test("published -> draft => 400 INVALID_TRANSITION", async () => {
    const res = await request(app)
      .patch(`/api/events/${IDS.evPublished}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "draft" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });

  test("cancelled -> published => 400 INVALID_TRANSITION", async () => {
    const res = await request(app)
      .patch(`/api/events/${IDS.evCancelled}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "published" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });
});

// ---------------------------------------------------------------------------
// Tests Dashboard
// ---------------------------------------------------------------------------
describe("Dashboard", () => {
  test("GET /dashboard/stats => 200 avec les bons champs", async () => {
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalEvents");
    expect(res.body).toHaveProperty("publishedEvents");
    expect(res.body).toHaveProperty("registrationsToday");
    expect(res.body).toHaveProperty("top5Events");
    expect(Array.isArray(res.body.top5Events)).toBe(true);
  });

  test("GET /dashboard/stats sans token => 401", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBe(401);
  });
});
