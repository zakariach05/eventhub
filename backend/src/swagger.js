// src/swagger.js — Specification OpenAPI 3.0 complete

export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title:       "EventHub API",
    version:     "1.0.0",
    description: "API REST de gestion d evenements — Node.js 20 + Express + PostgreSQL",
  },
  servers: [{ url: "http://localhost:3000/api", description: "Dev local" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code:    { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Donnees invalides" },
              details: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
      Event: {
        type: "object",
        properties: {
          id:              { type: "string", format: "uuid" },
          title:           { type: "string" },
          description:     { type: "string", nullable: true },
          location:        { type: "string", nullable: true },
          eventDate:       { type: "string", format: "date-time" },
          maxParticipants: { type: "integer" },
          status:          { type: "string", enum: ["draft","published","cancelled"] },
          registeredCount: { type: "integer" },
          createdBy:       { type: "string", format: "uuid" },
          createdAt:       { type: "string", format: "date-time" },
          updatedAt:       { type: "string", format: "date-time" },
        },
      },
      Participant: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          fullName:  { type: "string" },
          email:     { type: "string", format: "email" },
          phone:     { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Registration: {
        type: "object",
        properties: {
          id:               { type: "string", format: "uuid" },
          eventId:          { type: "string", format: "uuid" },
          eventTitle:       { type: "string" },
          participantId:    { type: "string", format: "uuid" },
          participantName:  { type: "string" },
          participantEmail: { type: "string" },
          status:           { type: "string", enum: ["pending","confirmed","cancelled"] },
          createdAt:        { type: "string", format: "date-time" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page:       { type: "integer" },
          limit:      { type: "integer" },
          total:      { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"], summary: "Health check", security: [],
        responses: { 200: { description: "OK" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"], summary: "Connexion", security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["email","password"],
            properties: {
              email:    { type: "string", format: "email", example: "admin@eventhub.com" },
              password: { type: "string", example: "Admin123!" },
            },
          }}},
        },
        responses: {
          200: { description: "Token JWT + info utilisateur" },
          401: { description: "Identifiants invalides", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"], summary: "Utilisateur connecte",
        responses: {
          200: { description: "Profil utilisateur" },
          401: { description: "Non authentifie" },
        },
      },
    },
    "/events": {
      get: {
        tags: ["Events"], summary: "Liste des evenements (paginees)",
        parameters: [
          { in:"query", name:"status",  schema:{ type:"string", enum:["draft","published","cancelled"] } },
          { in:"query", name:"date",    schema:{ type:"string", format:"date" }, description:"Format YYYY-MM-DD" },
          { in:"query", name:"page",    schema:{ type:"integer", default:1 } },
          { in:"query", name:"limit",   schema:{ type:"integer", default:10 } },
        ],
        responses: {
          200: { description: "Liste paginee", content: { "application/json": { schema: {
            type: "object",
            properties: {
              data:       { type: "array", items: { $ref: "#/components/schemas/Event" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }}}},
        },
      },
      post: {
        tags: ["Events"], summary: "Creer un evenement (admin/staff)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["title","eventDate","maxParticipants"],
            properties: {
              title:           { type: "string" },
              description:     { type: "string" },
              location:        { type: "string" },
              eventDate:       { type: "string", format: "date-time" },
              maxParticipants: { type: "integer", minimum: 1 },
            },
          }}},
        },
        responses: {
          201: { description: "Evenement cree" },
          400: { description: "Validation", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Role insuffisant" },
        },
      },
    },
    "/events/{id}": {
      get: {
        tags: ["Events"], summary: "Detail evenement avec registeredCount",
        parameters: [{ in:"path", name:"id", required:true, schema:{ type:"string", format:"uuid" } }],
        responses: {
          200: { description: "Evenement", content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } } },
          404: { description: "Introuvable" },
        },
      },
      put: {
        tags: ["Events"], summary: "Modifier un evenement (admin/staff)",
        parameters: [{ in:"path", name:"id", required:true, schema:{ type:"string", format:"uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type:"object" } } } },
        responses: { 200: { description: "Evenement mis a jour" }, 400: { description: "Erreur validation / regle metier" }, 404: { description: "Introuvable" } },
      },
    },
    "/events/{id}/status": {
      patch: {
        tags: ["Events"], summary: "Changer le statut (admin/staff) — machine a etats",
        parameters: [{ in:"path", name:"id", required:true, schema:{ type:"string", format:"uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", enum: ["draft","published","cancelled"] } },
          }}},
        },
        responses: {
          200: { description: "Statut mis a jour (+ cascade inscriptions si cancelled)" },
          400: { description: "Transition interdite" },
          404: { description: "Introuvable" },
        },
      },
    },
    "/participants": {
      get: {
        tags: ["Participants"], summary: "Liste des participants avec recherche ILIKE",
        parameters: [
          { in:"query", name:"search", schema:{ type:"string" }, description:"Recherche sur nom ou email" },
          { in:"query", name:"page",   schema:{ type:"integer", default:1 } },
          { in:"query", name:"limit",  schema:{ type:"integer", default:10 } },
        ],
        responses: { 200: { description: "Liste paginee" } },
      },
      post: {
        tags: ["Participants"], summary: "Creer un participant (admin/staff)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type:"object", required:["fullName","email"],
            properties: {
              fullName: { type:"string" }, email: { type:"string", format:"email" },
              phone:    { type:"string", nullable:true },
            },
          }}},
        },
        responses: { 201: { description: "Participant cree" }, 409: { description: "Email deja utilise" } },
      },
    },
    "/participants/{id}": {
      get: {
        tags: ["Participants"], summary: "Detail participant",
        parameters: [{ in:"path", name:"id", required:true, schema:{ type:"string", format:"uuid" } }],
        responses: { 200: { description: "Participant" }, 404: { description: "Introuvable" } },
      },
      put: {
        tags: ["Participants"], summary: "Modifier un participant (admin/staff)",
        parameters: [{ in:"path", name:"id", required:true, schema:{ type:"string", format:"uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type:"object" } } } },
        responses: { 200: { description: "Participant mis a jour" }, 409: { description: "Email deja utilise" } },
      },
      delete: {
        tags: ["Participants"], summary: "Supprimer un participant (admin seulement)",
        parameters: [{ in:"path", name:"id", required:true, schema:{ type:"string", format:"uuid" } }],
        responses: { 204: { description: "Supprime" }, 409: { description: "Inscriptions actives existantes" } },
      },
    },
    "/registrations": {
      get: {
        tags: ["Registrations"], summary: "Liste des inscriptions avec jointures",
        parameters: [
          { in:"query", name:"eventId", schema:{ type:"string", format:"uuid" } },
          { in:"query", name:"status",  schema:{ type:"string", enum:["pending","confirmed","cancelled"] } },
          { in:"query", name:"page",    schema:{ type:"integer", default:1 } },
          { in:"query", name:"limit",   schema:{ type:"integer", default:10 } },
        ],
        responses: { 200: { description: "Liste paginee avec noms evenement + participant" } },
      },
      post: {
        tags: ["Registrations"], summary: "Inscrire un participant (transaction + FOR UPDATE)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type:"object", required:["eventId","participantId"],
            properties: {
              eventId:       { type:"string", format:"uuid" },
              participantId: { type:"string", format:"uuid" },
            },
          }}},
        },
        responses: {
          201: { description: "Inscription creee" },
          400: { description: "Evenement non publie" },
          404: { description: "Evenement ou participant introuvable" },
          409: { description: "Doublon ou evenement complet" },
        },
      },
    },
    "/registrations/{id}/status": {
      patch: {
        tags: ["Registrations"], summary: "Changer le statut d une inscription",
        parameters: [{ in:"path", name:"id", required:true, schema:{ type:"string", format:"uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type:"object", required:["status"],
            properties: { status: { type:"string", enum:["pending","confirmed","cancelled"] } },
          }}},
        },
        responses: {
          200: { description: "Statut mis a jour (reactivation verifiee)" },
          400: { description: "Evenement non publie (reactivation)" },
          409: { description: "Evenement complet (reactivation)" },
        },
      },
    },
    "/dashboard/stats": {
      get: {
        tags: ["Dashboard"], summary: "Statistiques globales + top 5 evenements",
        responses: {
          200: {
            description: "Stats", content: { "application/json": { schema: {
              type: "object",
              properties: {
                totalEvents:        { type: "integer" },
                publishedEvents:    { type: "integer" },
                registrationsToday: { type: "integer" },
                top5Events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type:"string", format:"uuid" }, title: { type:"string" },
                      maxParticipants: { type:"integer" }, registeredCount: { type:"integer" },
                      fillRate: { type:"number" },
                    },
                  },
                },
              },
            }}},
          },
        },
      },
    },
  },
};
