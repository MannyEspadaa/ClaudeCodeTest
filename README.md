# Esports Hub

Central hub for the esports program: accounts, game communities, teams, schedules, VODs and statistics.
Requirements, decisions and the phased plan live in [`docs/requirements-baseline.md`](docs/requirements-baseline.md).

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Accounts, sessions, profiles, permission layer, admin bootstrap, CI | **Done** |
| 2 | Games, communities, teams, rosters, role management | Next |
| 3 | Events, schedules, calendar, dashboard | Planned |
| 4 | VODs, statistics, comments | Planned |
| 5 | Moderation, Discord, iCal feed | Planned |
| 6 | Hardening (load, accessibility, browsers) | Planned |

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · PostgreSQL 16 + Prisma 6 · argon2id · Tailwind CSS 4 · Vitest · Playwright.

## Getting started

Requirements: Node 22, PostgreSQL 16.

```bash
npm install
cp .env.example .env          # set DATABASE_URL and ALLOWED_EMAIL_DOMAINS
npm run db:migrate            # create tables
npm run dev                   # http://localhost:3000
```

With `MAIL_TRANSPORT=file` (the default in `.env.example`), verification and reset emails are written
as JSON files in `.mail-outbox/` instead of being sent. Use `smtp` with `SMTP_URL` in production.

### First administrator

```bash
ADMIN_PASSWORD='choose-a-long-password' npm run admin:create -- --email you@school.edu --name "Your Name" --username you
npm run admin:create -- --email existing@school.edu      # promote an existing account
```

## Tests

| Command | What it runs | Needs |
|---|---|---|
| `npm run test:unit` | Permission matrix (every role × action), validation, tokens, rate limiter | nothing |
| `npm run test:integration` | Account service against a real database | `.env.test` pointing at a database whose name contains `test` |
| `npm run test:e2e` | Browser tests of sign-up → verify → login → profile → password reset | `.env.e2e` and its database |

`.env.test` and `.env.e2e` are copies of `.env.example` with a different `DATABASE_URL`;
`.env.test` uses `MAIL_TRANSPORT="memory"`, `.env.e2e` uses port 3100 in `APP_URL`,
`MAIL_OUTBOX_DIR=".mail-outbox/e2e"` and `RATE_LIMIT_SCALE="100"`. CI creates them automatically.

## Code layout

```
src/
  app/                    Next.js routes
    (auth)/               login, register, verify-email, forgot/reset password
    (app)/                signed-in pages: dashboard, profile, users/[username]
    actions/              Server Actions (thin: rate limit → service → cookie/redirect)
  server/                 framework-independent business logic
    authz/policy.ts       the permission matrix — every access decision goes through can()
    authz/context.ts      loads a user's scoped roles; authorize() throws ForbiddenError
    auth/                 passwords, tokens, DB sessions, cookie glue
    services/             account service, admin bootstrap
    validation/           zod schemas
    mail/                 console | file | smtp | memory transports
prisma/                   schema and migrations
tests/{unit,integration,e2e}
```

### Adding a protected feature

1. Add the action to `ACTIONS` in `src/server/authz/policy.ts` and its rule in `can()`.
2. Add matrix rows in `tests/unit/policy-matrix.test.ts` (a test fails if any action is uncovered).
3. In the page or action: `const { ctx } = await requireUser(); authorize(ctx, "your.action", resource);`

## Known limitations

- Rate limiting is in memory, so it only works correctly with a single server instance.
- The dashboard is a shell until Phases 2–3 provide content.
