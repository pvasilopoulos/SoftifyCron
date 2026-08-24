# SoftifyCron

Multi-tenant HTTP cron control plane. Each workspace has its own users, jobs, and run history on **MySQL**. A Node worker claims due rows and executes them.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind v4
- Prisma + MySQL 8 / MariaDB
- Signed HTTP-only session cookies (`jose`)
- Dedicated scheduler worker with row locking

## Quick start

```bash
cp .env.example .env
# set AUTH_SECRET to a long random string
docker compose up -d mysql
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

Demo login:

- email `demo@softifycron.dev`
- password `Demo1234!`

`npm run dev` starts the web app **and** the cron worker.

## What you get

- Register creates a **tenant** + owner user
- Login is scoped to that tenant
- CRUD for per-tenant cron jobs (HTTP GET/POST/PUT/PATCH/DELETE)
- Pause / resume / run now
- Execution history stored in MySQL
- SSRF guard: localhost, private, and link-local targets are rejected

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Web + worker |
| `npm run worker` | Scheduler only |
| `npx prisma migrate deploy` | Apply SQL migrations |
| `npm test` | Unit tests (cron + SSRF) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
