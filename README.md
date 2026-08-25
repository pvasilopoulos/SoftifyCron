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

- email `demo@softifycron.dev`
- password `Demo1234!`

`npm run dev` starts the web app **and** the cron worker.

## What you get

- Register creates a **tenant** + owner user, with default job groups
- Login is scoped to that tenant; invites join teammates as admin or member
- HTTP, heartbeat, and webhook jobs with groups, tags, search, and bulk actions
- Pause / resume / duplicate / run now
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
