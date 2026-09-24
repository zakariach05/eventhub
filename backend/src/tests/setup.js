// src/tests/setup.js
// Initialise une DB de test, applique le schema et insere les donnees minimales.
// Chaque suite de tests appelle resetDb() pour repartir d un etat propre.

import { randomUUID } from "crypto";
import bcrypt         from "bcrypt";
import pg             from "pg";

const { Pool } = pg;

// DB de test — variable d env TEST_DATABASE_URL ou fallback
export const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL,
});

// UUIDs stables reutilises entre les tests
export const IDS = {
  admin:         randomUUID(),
  staff:         randomUUID(),
  evPublished:   randomUUID(),
  evDraft:       randomUUID(),
  evFull:        randomUUID(),   // published, max 1 place
  evCancelled:   randomUUID(),
  p1:            randomUUID(),
  p2:            randomUUID(),
  p3:            randomUUID(),
  regCancelled:  randomUUID(),   // inscription cancelled sur evPublished/p3
};

let initialized = false;

export async function resetDb() {
  // Reinitialiser les IDS dynamiques
  Object.assign(IDS, {
    admin:        randomUUID(), staff:       randomUUID(),
    evPublished:  randomUUID(), evDraft:     randomUUID(),
    evFull:       randomUUID(), evCancelled: randomUUID(),
    p1:           randomUUID(), p2:          randomUUID(),
    p3:           randomUUID(), regCancelled:randomUUID(),
  });

  await testPool.query("DELETE FROM registrations");
  await testPool.query("DELETE FROM events");
  await testPool.query("DELETE FROM participants");
  await testPool.query("DELETE FROM users");

  const adminHash = await bcrypt.hash("Admin123!", 4); // rounds reduits pour la vitesse
  const staffHash = await bcrypt.hash("Staff123!", 4);

  // Users
  await testPool.query(
    `INSERT INTO users (id,full_name,email,password_hash,role) VALUES
      ($1,'Admin Test','admin@test.com',$2,'admin'),
      ($3,'Staff Test','staff@test.com',$4,'staff')`,
    [IDS.admin, adminHash, IDS.staff, staffHash]
  );

  // Events
  await testPool.query(
    `INSERT INTO events (id,title,event_date,max_participants,status,created_by) VALUES
      ($1,'Ev Published', NOW()+INTERVAL '30 days', 10, 'published', $5),
      ($2,'Ev Draft',     NOW()+INTERVAL '30 days', 10, 'draft',     $5),
      ($3,'Ev Full',      NOW()+INTERVAL '30 days', 1,  'published', $5),
      ($4,'Ev Cancelled', NOW()+INTERVAL '30 days', 10, 'cancelled', $5)`,
    [IDS.evPublished, IDS.evDraft, IDS.evFull, IDS.evCancelled, IDS.admin]
  );

  // Participants
  await testPool.query(
    `INSERT INTO participants (id,full_name,email) VALUES
      ($1,'Alice Test','alice@test.com'),
      ($2,'Bob Test',  'bob@test.com'),
      ($3,'Carol Test','carol@test.com')`,
    [IDS.p1, IDS.p2, IDS.p3]
  );

  // Remplir evFull avec p1 (1/1 place)
  await testPool.query(
    `INSERT INTO registrations (event_id,participant_id,status) VALUES ($1,$2,'confirmed')`,
    [IDS.evFull, IDS.p1]
  );

  // Inscription cancelled sur evPublished/p3 (pour tester reactivation)
  await testPool.query(
    `INSERT INTO registrations (id,event_id,participant_id,status) VALUES ($1,$2,$3,'cancelled')`,
    [IDS.regCancelled, IDS.evPublished, IDS.p3]
  );
}

export async function closeDb() {
  await testPool.end();
}
