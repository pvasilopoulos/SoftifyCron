export const OPENAPI_DOC = {
  openapi: "3.0.3",
  info: {
    title: "SoftifyCron API",
    version: "1.0.0",
    description: "Tenant API for jobs, runs, and heartbeats. Authenticate with a Bearer workspace token.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/jobs": {
      get: {
        summary: "List jobs",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Job list" } },
      },
      post: {
        summary: "Create a job",
        responses: { "201": { description: "Created" } },
      },
    },
    "/jobs/{id}/run": {
      post: {
        summary: "Run a job now",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Run result" } },
      },
    },
    "/jobs/{id}/heartbeat": {
      post: {
        summary: "Heartbeat ping",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
  },
  security: [{ bearerAuth: [] }],
} as const;
