# SoftifyCron

Multi-tenant HTTP cron control plane. Each workspace has its own users, jobs, secrets, and run history on **MySQL**. A Node worker claims due rows and executes them.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind v4
- Prisma + MySQL 8 / MariaDB
- Signed HTTP-only session cookies (`jose`)
- Dedicated scheduler worker with row locking
- Mobile-first app shell with bottom navigation

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

- platform admin `admin@softifycron.dev` / `Admin1234!` (sees every customer)
- customer `demo@softifycron.dev` / `Demo1234!` (Aurora Studio only)
- customer `customer@softifycron.dev` / `Demo1234!` (Helios Labs only)

`npm run dev` starts the web app **and** the cron worker.

## What you get

- **Platform superadmin** lists all customers and can open any workspace
- **Customer login** is locked to one tenant — jobs, runs, and secrets never leak
- Register creates a **tenant** + owner user, with default job groups
- Invites join teammates as admin or member inside that customer
- HTTP, heartbeat, and webhook jobs with groups, tags, search, and bulk actions
- Pause / resume / duplicate / delete / run now, plus optional last-response viewer
- Retries, failure webhooks, and `{{SECRET:KEY}}` interpolation
- Execution history stored in MySQL, filterable on desktop and phone
- SSRF guard: localhost, private, and link-local targets are rejected

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Web + worker |
| `npm run worker` | Scheduler only |
| `npx prisma migrate deploy` | Apply SQL migrations |
| `npm test` | Unit tests (cron + SSRF + secrets) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
