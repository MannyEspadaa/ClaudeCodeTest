# Test report

Final run on 2026-11-19 against a production build (`next build && next start`), PostgreSQL 16, Node 22, 4-CPU Linux container.

| Suite | Command | Result |
|---|---|---|
| Lint | `npm run lint` | clean |
| Types | `npm run typecheck` | clean |
| Unit | `npm run test:unit` | **305 passed** (5 files): permission matrix (every action × 7 personas), validation, tokens, time zones, formulas, iCal |
| Integration | `npm run test:integration` | **71 passed** (8 files): every service against a real database, including concurrency cases |
| End-to-end | `npm run test:e2e` | **16 passed** (6 files) in desktop Chromium, including accessibility (axe-core) on 21 pages in light and dark themes |
| Load (NFREQ1) | `npm run test:load` | see below |
| Backup/restore (NFREQ13) | `scripts/backup.sh` + `pg_restore` | restored copy matched source row counts; retention deleted the >14-day file |

## Concurrency cases covered

- Four simultaneous approvals for a 1-player roster → exactly one succeeds.
- Two admins revoking each other's Admin role at once → one succeeds, one gets `LAST_ADMIN`.
- Two admins suspending each other at once → same.
- 20 simultaneous login attempts against a limit of 5 → exactly 5 allowed.

## Load test (NFREQ1: at least 200 concurrent users)

200 signed-in virtual users with real sessions, browsing dashboard, calendar, games, community, team and schedule pages,
plus the public landing page. Single Node.js process.

| Scenario | Throughput | Errors | p50 | p95 | p99 |
|---|---|---|---|---|---|
| 200 users, ~5 s between page loads (busy real-world use) | 39 req/s | **0%** | 54 ms | **341 ms** | 591 ms |
| 200 users, ~1 s between page loads (stress) | 61 req/s | **0%** | 2.3 s | 3.0 s | 5.6 s |

**Interpretation.** NFREQ1 is met: 200 concurrent users are served with no errors and sub-second pages at realistic
activity levels. Under the stress profile (200 page loads per second requested), one Node.js process becomes
CPU-bound at about 60–70 requests/s. Requests queue but none fail. To raise that ceiling, run several app instances behind a load
balancer. Sessions and rate limits are already stored in Postgres, so instances share state. The one per-instance
piece is the 5-minute cache of the public calendar.

## Not verified in this environment

- **Firefox, WebKit (Safari) and Edge** (NFREQ15): configured in `playwright.config.ts` and CI, but only Chromium is installed in the build sandbox.
- **Docker image**: `Dockerfile` and `docker-compose.yml` are written, but the image could not be built here because the sandbox blocks package-mirror access from inside build containers.
- **Real Discord OAuth** (FREQ42): the flow is tested with Discord's API mocked; it needs a Discord application's client id/secret to run for real.
- **Real SMTP delivery**: emails are tested via memory/file transports; production needs `SMTP_URL`.
- **Manual accessibility review** with a screen reader (automated axe checks pass).
