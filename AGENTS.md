<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

SoftifyCron is a Next.js 16 app plus a `tsx` cron worker, backed by MySQL/MariaDB (see `README.md` for the full stack and script list). The startup layer only runs `npm ci`; the database service and env file are provided by the VM snapshot, not by the update script.

- Database: a local MariaDB (drop-in for the MySQL the app expects) is installed in the snapshot, but there is no systemd here, so it is not auto-started. Start it before running the app or migrations: in a tmux session run `sudo mariadbd-safe --datadir=/var/lib/mysql`, then confirm with `mysqladmin -usoftify -psoftify -h127.0.0.1 ping`. DB `softifycron` and user `softify`/`softify` already exist and match `.env`.
- Env loading gotcha: only `next dev` and the Prisma CLI auto-load `.env`. The `tsx` processes (`npm run dev`'s worker, `npm run worker`, `npm run db:seed`) do NOT, and will fail with `Environment variable not found: DATABASE_URL`. Before running any of those, export the env into the shell: `set -a && . ./.env && set +a`.
- Run the app with `npm run dev` (web on http://localhost:3000 + worker in one process). The worker ticks every second, claims due jobs with row locking, and logs `[worker] executed N due job(s)`.
- `npm run lint`, `npm test` (cron + SSRF unit tests, no DB needed), and `npm run build` all pass as-is. Only `db:seed`/`dev`/`build` runtime need the DB running and env exported.
- Demo login (created by `npm run db:seed`): `demo@softifycron.dev` / `Demo1234!`.
