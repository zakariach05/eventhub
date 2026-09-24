# EventHub — Entity-Relationship Diagram

## Diagramme Mermaid

```mermaid
erDiagram
    USERS {
        uuid        id               PK  "gen_random_uuid()"
        varchar     full_name        NN
        varchar     email            UK  "UNIQUE + NOT NULL"
        text        password_hash    NN
        varchar     role             NN  "CHECK IN (admin,staff)"
        timestamptz created_at           "DEFAULT now()"
    }

    EVENTS {
        uuid        id               PK  "gen_random_uuid()"
        varchar     title            NN
        text        description
        varchar     location
        timestamptz event_date       NN
        integer     max_participants  NN  "CHECK > 0"
        varchar     status           NN  "CHECK IN (draft,published,cancelled) DEFAULT draft"
        uuid        created_by       FK  "-> users.id ON DELETE RESTRICT"
        timestamptz created_at           "DEFAULT now()"
        timestamptz updated_at           "DEFAULT now() trigger auto"
    }

    PARTICIPANTS {
        uuid        id               PK  "gen_random_uuid()"
        varchar     full_name        NN
        varchar     email            UK  "UNIQUE NOT NULL"
        varchar     phone
        timestamptz created_at           "DEFAULT now()"
    }

    REGISTRATIONS {
        uuid        id               PK  "gen_random_uuid()"
        uuid        event_id         FK  "-> events.id ON DELETE CASCADE"
        uuid        participant_id   FK  "-> participants.id ON DELETE CASCADE"
        varchar     status           NN  "CHECK IN (pending,confirmed,cancelled) DEFAULT pending"
        timestamptz created_at           "DEFAULT now()"
    }

    USERS        ||--o{ EVENTS        : "cree (created_by)"
    EVENTS       ||--o{ REGISTRATIONS : "contient"
    PARTICIPANTS ||--o{ REGISTRATIONS : "s inscrit"
```

---

## Relations et cardinalites

| Relation | Type | Description |
|----------|------|-------------|
| `users` -> `events` | 1-N | Un user peut creer plusieurs evenements. `ON DELETE RESTRICT` : impossible de supprimer un user ayant des evenements. |
| `events` -> `registrations` | 1-N | Un evenement possede plusieurs inscriptions. `ON DELETE CASCADE`. |
| `participants` -> `registrations` | 1-N | Un participant peut avoir plusieurs inscriptions sur des evenements differents. `ON DELETE CASCADE`. |
| `events` + `participants` | N-N | Relation materialisee par `registrations` avec `UNIQUE(event_id, participant_id)`. |

---

## Contraintes

### `users`
| Contrainte | Colonne | Detail |
|------------|---------|--------|
| `PK` | `id` | UUID genere par pgcrypto |
| `NOT NULL` | `full_name`, `email`, `password_hash`, `role` | Aucun champ identitaire vide |
| `UNIQUE` | `email` | Un seul compte par adresse |
| `CHECK` | `role` | Valeurs admises : `admin`, `staff` |

### `events`
| Contrainte | Colonne | Detail |
|------------|---------|--------|
| `PK` | `id` | UUID |
| `NOT NULL` | `title`, `event_date`, `max_participants`, `status`, `created_by` | Champs obligatoires |
| `CHECK` | `max_participants` | `> 0` |
| `CHECK` | `status` | `draft`, `published`, `cancelled` |
| `FK RESTRICT` | `created_by` | L auteur ne peut pas etre supprime |

### `participants`
| Contrainte | Colonne | Detail |
|------------|---------|--------|
| `PK` | `id` | UUID |
| `NOT NULL` | `full_name`, `email` | Identite minimale |
| `UNIQUE` | `email` | Doublons bloques (+ index insensible a la casse) |
| `NULL` | `phone` | Optionnel |

### `registrations`
| Contrainte | Colonne | Detail |
|------------|---------|--------|
| `PK` | `id` | UUID |
| `NOT NULL` | `event_id`, `participant_id`, `status` | Tous obligatoires |
| `CHECK` | `status` | `pending`, `confirmed`, `cancelled` |
| `UNIQUE` | `(event_id, participant_id)` | Un participant s inscrit une seule fois par evenement |
| `FK CASCADE` | `event_id`, `participant_id` | Suppression en cascade |

---

## Index et justifications

| Index | Table | Colonnes | Justification |
|-------|-------|----------|---------------|
| `idx_events_status` | `events` | `status` | Filtre frequent `GET /events?status=` |
| `idx_events_event_date` | `events` | `event_date` | Tri chronologique et filtre `?date=` |
| `idx_registrations_event_status` | `registrations` | `(event_id, status)` | Comptage de places actives dans la verification de capacite |
| `idx_registrations_participant` | `registrations` | `participant_id` | Verification d inscription existante, suppression participant |
| `idx_registrations_created_at` | `registrations` | `created_at` | Dashboard : inscriptions du jour |
| `idx_participants_email_lower` | `participants` | `lower(email)` | Unicite insensible a la casse |
| `idx_participants_full_name` | `participants` | `full_name` | Recherche ILIKE `GET /participants?search=` |

---

## Machine a etats — events.status

```
draft ──────────► published ──────────► cancelled
  │                                         ^
  └────────────────────────────────────────►┘
```

- `draft -> published` OK
- `draft -> cancelled` OK
- `published -> cancelled` OK (cascade sur les inscriptions)
- Toute autre transition -> HTTP 400
- `cancelled` est un etat TERMINAL

---

## Machine a etats — registrations.status

```
pending ──► confirmed
   ^            │
   │            v
cancelled ◄─────┘
```

- Reactivation (`cancelled -> pending/confirmed`) : reverifier capacite + evenement publie.
