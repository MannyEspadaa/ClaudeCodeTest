# Esports Hub

A central hub for a school esports program. Students join game communities, get placed on teams, follow schedules
and events, and review VODs and statistics with their coaches. Game Managers run their games' teams. Administrators
manage everything.

- Requirements, decisions and plan: [`docs/requirements-baseline.md`](docs/requirements-baseline.md)
- Requirement → code → test mapping: [`docs/traceability.md`](docs/traceability.md)
- Test results, including load test: [`docs/test-report.md`](docs/test-report.md)

## What each role can do

Roles are **scoped**: a person can be a Player in one game and a Game Manager in another. Within a game the hierarchy holds
(Game Manager ⊇ Player ⊇ Community Member ⊇ User). Administrators can do everything everywhere.

| Role | Can |
|---|---|
| Visitor (logged out) | See public matches and events on the landing page |
| User | Sign up with school email, verify, log in, reset password; edit profile; link Discord; dashboard; calendar; subscribe via iCal; join game communities |
| Community Member (of a game) | See the game's teams and announcements; request to join a team; cancel requests |
| Player (on a team) | Team page, team-only schedule, VODs with coach notes (and reply), match and season stats; leave the team |
| Game Manager (of a game) | Create/edit/archive/delete teams; approve/deny requests; add/remove players; schedule matches, scrims and practices (with conflict warnings); events; announcements; add VODs; enter stats; write notes |
| Administrator | All of the above in every game; create/archive games; define stats and formulas per game; grant/revoke Game Manager and Admin; suspend, lift and remove accounts; program-wide events and announcements |

## Quick start (local)

Requirements: Node 22, PostgreSQL 16.

```bash
npm install
cp .env.example .env            # set DATABASE_URL, ALLOWED_EMAIL_DOMAINS, APP_TIMEZONE
npm run db:migrate              # create the schema
npm run db:seed                 # optional demo data (see below)
npm run dev                     # http://localhost:3000
```

**Demo data.** `npm run db:seed` creates two games, teams, a schedule, a VOD with notes and match stats. Log in as
`admin@example.edu`, `coach_sam@example.edu` (Game Manager), `nova@example.edu` (Player) or `rookie@example.edu`
(pending request), all with password `esports-demo-1`. It refuses to run if the database already has users.

**Email.** With `MAIL_TRANSPORT=file`, verification and reset emails are written as JSON files to `.mail-outbox/`
instead of being sent. Use `MAIL_TRANSPORT=smtp` with `SMTP_URL` in production.

**First administrator** (without demo data):

```bash
ADMIN_PASSWORD='choose-a-long-password' npm run admin:create -- --email you@school.edu --name "Your Name" --username you
```

## Configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | Public base URL (used in emailed links, iCal and Discord redirects) |
| `APP_TIMEZONE` | IANA zone for all entered and displayed times, e.g. `America/Chicago` |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated domains allowed to register (FREQ1) |
| `MAIL_TRANSPORT` | `smtp` \| `file` \| `console` \| `memory` |
| `SMTP_URL`, `MAIL_FROM` | Outgoing mail |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Optional Discord linking. Redirect URI: `<APP_URL>/api/discord/callback`, scope `identify` |
| `RATE_LIMIT_SCALE` | Multiplies auth rate limits; keep `1` in production |

## Deployment

**Docker Compose:**

```bash
docker compose up --build
```

This starts PostgreSQL and the app, and runs migrations on start. Put secrets in a `.env` file next to `docker-compose.yml`.
Note: the image was written but not built in the development sandbox (see the test report).

**Any Node host:** run `npm ci && npx prisma migrate deploy && npm run build && npm start` behind HTTPS.

**Operations:**

- **Backups (NFREQ13):** schedule `scripts/backup.sh` daily (e.g. cron `15 3 * * *`). It keeps 14 days. Restore with
  `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <file>.dump`.
- **Scaling:** sessions and rate limits live in Postgres, so you can run several instances behind a load balancer.

## Tests

| Command | What | Needs |
|---|---|---|
| `npm run test:unit` | Permission matrix, validation, time zones, formulas, iCal | nothing |
| `npm run test:integration` | Every service against a real database | `.env.test` with a database name containing `test`, `MAIL_TRANSPORT="memory"` |
| `npm run test:e2e` | Browser journeys for every phase + accessibility | `.env.e2e` (port 3100 in `APP_URL`, `MAIL_OUTBOX_DIR=".mail-outbox/e2e"`, `RATE_LIMIT_SCALE="100"`, DB name containing `e2e`) |
| `E2E_ALL_BROWSERS=1 npm run test:e2e` | Same in Firefox, WebKit and Edge | those browsers installed |
| `npm run test:load` | 200 concurrent users (NFREQ1) against a running server on :3100 | `.env.e2e` database; never production |

`.env.test` and `.env.e2e` are copies of `.env.example` with those changes; CI creates them automatically
(`.github/workflows/ci.yml`).

## Architecture

```
src/
  app/                     Next.js App Router (server components + Server Actions)
    (auth)/                login, register, verify, password reset
    (app)/                 signed-in pages: dashboard, calendar, games, teams, manage, announcements, admin, profile
    schedule/[kind]/[id]   event/match detail (public items visible to visitors)
    api/                   Discord OAuth callback, iCal feed
    actions/               Server Actions — thin: resolve user → call service → refresh
  server/                  business logic, independent of Next.js
    authz/policy.ts        THE permission matrix: every access decision is can(actor, action, resource)
    authz/context.ts       loads a user's scoped roles (communities, teams, managed games)
    services/              accounts, games, communities, teams, rosters, roles, schedules, calendar,
                           announcements, VODs, stats, comments, moderation, Discord, feed
  lib/                     pure helpers: time zones, formulas, iCal, VOD embeds
prisma/                    schema + migrations
scripts/                   create-admin, seed, backup, load test
tests/{unit,integration,e2e}
```

**Adding a protected feature:**

1. Add the action to `ACTIONS` and its rule in `can()` (`src/server/authz/policy.ts`).
2. Add rows to `tests/unit/policy-matrix.test.ts`. A test fails if any action is uncovered.
3. Call `authorize(ctx, "your.action", resource)` in the **service**, not just the page. Layouts don't protect pages.

## Known limitations

- VODs are links (YouTube/Twitch embed inline). Direct file upload is a planned stretch goal.
- The public calendar cache (5 minutes) is per instance, so with several instances a change can take up to 5 minutes to appear for logged-out visitors.
- Discord integration shows usernames only (no bot).
- No email notifications for roster decisions or new notes yet. They appear on the dashboard and pages.
