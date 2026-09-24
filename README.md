# EventHub — Application de gestion d evenements

Application fullstack PERN (PostgreSQL + Express + React + Node.js) permettant de
gerer des evenements, des participants et des inscriptions, avec un dashboard de statistiques.

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Backend** | Node.js 20 (ESM), Express 4, driver `pg` (requetes SQL parametrees), JWT, bcrypt, Zod, helmet, cors, express-rate-limit |
| **Base de donnees** | PostgreSQL 16, UUID via pgcrypto, contraintes CHECK/UNIQUE/FK, index B-tree |
| **Frontend** | React 18 + Vite, react-router-dom, axios, Tailwind CSS v4 |
| **Docs / Tests** | Swagger UI (OpenAPI 3.0), Jest + Supertest |

---

## Prerequis

- Node.js >= 20.0.0
- PostgreSQL >= 14 (ou Docker)
- npm >= 9

---

## Installation — sans Docker

### 1. Cloner le projet

```bash
git clone <repo>
cd Test-Tython
```

### 2. Base de donnees

```bash
# Creer la base
createdb eventhub

# Appliquer le schema (idempotent)
psql -d eventhub -f backend/sql/schema.sql
```

### 3. Backend

```bash
cd backend
cp .env.example .env
# Editer .env avec vos valeurs (DATABASE_URL, JWT_SECRET...)
npm install
npm run seed        # insere les donnees de test
npm run dev         # http://localhost:3000
```

### 4. Frontend

```bash
cd ../frontend
cp .env.example .env
# Verifier VITE_API_URL=http://localhost:3000/api
npm install
npm run dev         # http://localhost:5173
```

---

## Installation — avec Docker

```bash
# Lancer les 3 services (postgres + backend + frontend)
docker-compose up --build

# Premier demarrage : lancer le seed
docker-compose exec backend node scripts/seed.js
```

Acces : Frontend → http://localhost | Backend → http://localhost:3000 | Swagger → http://localhost:3000/api-docs

---

## Variables d environnement (backend)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `PORT` | Port du serveur | `3000` |
| `NODE_ENV` | Environnement | `development` |
| `DATABASE_URL` | URL connexion PostgreSQL | `postgresql://postgres:password@localhost:5432/eventhub` |
| `JWT_SECRET` | Cle secrete JWT (>= 32 chars) | `mon_super_secret_...` |
| `JWT_EXPIRES_IN` | Duree de validite du token | `8h` |
| `CORS_ORIGIN` | Origine autorisee | `http://localhost:5173` |

---

## Commandes

```bash
# Backend
npm run dev          # Serveur avec hot-reload (node --watch)
npm run start        # Serveur production
npm run seed         # Seed idempotent (recharge les donnees de test)
npm run test         # Tests Jest + Supertest (necessite DB accessible)

# Frontend
npm run dev          # Dev Vite
npm run build        # Build production
npm run preview      # Preview du build

# Base de donnees
psql -d eventhub -f backend/sql/schema.sql   # (Re)appliquer le schema
```

---

## Comptes de test (apres seed)

| Email | Mot de passe | Role |
|-------|-------------|------|
| admin@eventhub.com | Admin123! | admin |
| staff@eventhub.com | Staff123! | staff |

---

## Endpoints API

| Methode | Endpoint | Role requis | Description |
|---------|----------|-------------|-------------|
| GET | `/api/health` | public | Health check |
| POST | `/api/auth/login` | public | Connexion |
| GET | `/api/auth/me` | tous | Profil connecte |
| GET | `/api/events` | tous | Liste paginee (filtres status, date) |
| POST | `/api/events` | admin, staff | Creer un evenement |
| GET | `/api/events/:id` | tous | Detail + registeredCount |
| PUT | `/api/events/:id` | admin, staff | Modifier |
| PATCH | `/api/events/:id/status` | admin, staff | Changer le statut |
| GET | `/api/participants` | tous | Liste + recherche ILIKE |
| POST | `/api/participants` | admin, staff | Creer |
| GET | `/api/participants/:id` | tous | Detail |
| PUT | `/api/participants/:id` | admin, staff | Modifier |
| DELETE | `/api/participants/:id` | **admin** | Supprimer |
| GET | `/api/registrations` | tous | Liste paginee + jointures |
| POST | `/api/registrations` | admin, staff | Inscrire (transaction + FOR UPDATE) |
| PATCH | `/api/registrations/:id/status` | admin, staff | Changer le statut |
| GET | `/api/dashboard/stats` | tous | Stats + top 5 |

Documentation interactive : **http://localhost:3000/api-docs** (dev uniquement)

---

## Regles metier

1. Inscription impossible sur evenement non publie (400 EVENT_NOT_PUBLISHED)
2. Un participant ne peut s inscrire qu une seule fois par evenement (409 DUPLICATE_REGISTRATION)
3. La capacite (pending + confirmed) ne peut pas etre depassee (409 EVENT_FULL) — protege par transaction SELECT FOR UPDATE
4. Annuler un evenement annule toutes ses inscriptions dans la meme transaction
5. Transitions de statut : draft->published, draft->cancelled, published->cancelled uniquement
6. Reactiver une inscription cancelled reverifiee capacite + statut publie de l evenement
7. Impossible de reduire maxParticipants en dessous du nombre d inscriptions actives

---

## Choix techniques

| Choix | Justification |
|-------|---------------|
| **ESM natif** | `"type":"module"` — syntaxe moderne, pas de transpilation |
| **Driver `pg` sans ORM** | Requetes SQL parametrees completes, pas d abstraction cachee |
| **`SELECT FOR UPDATE`** | Elimine les race conditions lors d inscriptions simultanees |
| **Architecture modules** | routes -> controller -> service -> repository — separation claire des responsabilites |
| **Zod sur env.js** | Fail-fast au boot si la config est incomplete |
| **Message d erreur login generique** | Evite l enumeration d emails (timing-safe avec bcrypt.compare sur hash factice) |
| **Index expression `lower(email)`** | Unicite et recherche insensible a la casse sans overhead applicatif |
| **`COUNT FILTER`** | Agregation conditionnelle en une passe — plus efficace qu un CASE WHEN |
| **Tailwind v4 via `@tailwindcss/vite`** | Plugin officiel Vite — zero config PostCSS |
| **Debounce 300ms** | Evite les requetes API a chaque frappe dans la recherche participants |

---

## Limites connues et ameliorations possibles

- Refresh token non implemente (le token expire apres JWT_EXPIRES_IN)
- Pas de pagination cote frontend pour les evenements dans RegistrationForm (charge jusqu a 100)
- Les tests Jest necessitent une base PostgreSQL accessible (pas de mock)
- Pas de upload de fichiers / images pour les evenements
- Notifications email lors d une inscription non implementees
- Pas de tri configurable dans les listes (ordre fixe)
