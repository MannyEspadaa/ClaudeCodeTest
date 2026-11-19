# Esports Hub

A central web hub for an esports program: accounts with official-email
verification, game communities (rosters), teams, events and match/practice
schedules with calendar integration, Discord linking, VODs and team statistics,
with role-based access for **Users, Community Members, Players, Game Managers
and Administrators**.

Built with Python 3.12+ and Django 5.2 (server-rendered). See:

- `docs/DECISIONS.md` — how gaps and conflicts in the specification were resolved
- `docs/TRACEABILITY.md` — requirement → use case → code → test mapping
- `docs/source/` — the original use cases, specifications and test cases

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py create_admin --username admin --email admin@school.edu --password 'change-me-Now1'
python manage.py runserver
```

Open http://127.0.0.1:8000, sign in as the admin, add a game community under
**Communities**, and grant a Game Manager under **Users**. Verification emails
are printed to the console in development.

## Tests

```bash
pytest
```

122 automated tests cover every test case TC-1…TC-57, including a 200-user
concurrent load test (NFREQ1) and a calendar render-time test (NFREQ8).

## Roles

| Role | How it is held | Can |
|---|---|---|
| User | verified, active account | profile, dashboard, calendar, Discord, join rosters |
| Community Member | on a game's roster | see that game's roster and community schedules |
| Player | on a team (added by a Game Manager) | team VODs, statistics, comments and team schedules |
| Game Manager | assigned to a game by an Administrator | teams, events, schedules and analytics for that game |
| Administrator | granted by an Administrator | everything, including roles, moderation and game communities |

Roles stack: a Player is also a Community Member and a User. One person can hold
several roles in different games.

## Configuration (environment variables)

| Variable | Purpose | Default |
|---|---|---|
| `DJANGO_SECRET_KEY` | secret key (required when `DJANGO_DEBUG=0`) | dev key |
| `DJANGO_DEBUG` | debug mode | `1` |
| `DJANGO_ALLOWED_HOSTS` | comma-separated hosts | localhost |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` (needs `psycopg`) or `sqlite:///path` | `db.sqlite3` |
| `OFFICIAL_EMAIL_DOMAINS` | comma-separated domains accepted at registration (subdomains allowed) | `school.edu` |
| `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL` | outgoing mail | console |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | real Discord OAuth2 (redirect URI: `/discord/callback/`) | local authorization page |
| `CALENDAR_PROVIDER` | calendar adapter class | `integrations.calendar.LocalCalendarProvider` |
| `TIME_ZONE` | program time zone | `America/Chicago` |
| `DJANGO_SECURE_SSL_REDIRECT`, `DJANGO_HSTS_SECONDS`, `DJANGO_BEHIND_TLS_PROXY` | production TLS settings | on / 3600 / off |

Every user gets a personal iCalendar feed (shown on the Calendar page) that
subscribes into Google, Outlook or Apple Calendar.

## Team data CSV format

```
match_date,opponent,result,score_for,score_against
2026-10-01,State U,W,13,7
```

`result` is W, L or D. Files are validated as a whole; any bad row rejects the upload.

## Project layout

```
accounts/      users, registration, profiles, Discord, admin roles & moderation
teams/         games (communities), rosters, teams, promotion to Player
scheduling/    events, game schedules, calendar and iCalendar feed
analytics/     VODs, CSV statistics, manager comments
integrations/  calendar and Discord adapters
core/          permissions (single source of authorization), dashboard
templates/, static/   desktop UI
tests/         pytest suites mapped to TC-1…TC-57
```
