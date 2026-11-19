# Design Decisions (Phase 0)

The source documents (`docs/source/`) left a number of gaps and conflicts. No
requirements (SRS) text was supplied, so requirement meaning was inferred from
the use cases and test cases that cite each ID. Every decision below names the
gap it resolves and the requirement/use case/test case it traces to.

## D1. Technology stack
- **Python 3.12+ / Django 5.2, server-rendered templates.** Built-in password
  hashing, sessions, CSRF protection, form validation and migrations satisfy
  FREQ1/FREQ4/NFREQ4 with little custom security code; server-rendered pages
  keep NFREQ5 (desktop) and NFREQ8 (calendar < 3 s) simple.
- **Database:** PostgreSQL in production via `DATABASE_URL`
  (`postgres://user:pass@host:port/name`, requires `psycopg`). SQLite in WAL mode
  with `IMMEDIATE` transactions is the zero-config default for development and
  tests. NFREQ1 (200 concurrent users) is verified against SQLite in WAL mode
  (`tests/test_completion.py`); PostgreSQL is recommended for deployment.

## D2. Roles and hierarchy (userContext Q1–Q5, NFREQ4)
Roles are **derived from scoped data**, not stored as free-floating flags:

| Role | Held when | Scope |
|---|---|---|
| User | Account exists, email verified, status active | global |
| Community Member | Active membership in a game community (roster) | per game |
| Player | Membership in a team | per team |
| Game Manager | `GameManagerAssignment(user, game)` exists | per game |
| Administrator | `is_administrator = True` | global |

- Hierarchy: Player ⊇ Community Member ⊇ User. A Player is automatically a
  Community Member of the team's game.
- A Game Manager can view and manage everything inside their assigned games
  (teams, VODs, stats, schedules, events), but nothing in other games.
- An Administrator can see and manage everything.
- A person can hold several roles simultaneously (e.g. Player in game A and
  Game Manager of game B); each is evaluated against its own scope.
- All checks live in one module, `core/permissions.py`, which is used by every
  view and every list query (lists are filtered, not just guarded).

## D3. Rosters, communities and teams (conflict B1, C1, C5, C6, C7)
- A **game roster is the game's community membership list.** Joining a game's
  roster makes the user a Community Member of that game (resolves the
  unspecified "Join Game Community" use case together with UC‑6).
- Join/leave is **immediate by default**. Each game has a
  `join_requires_approval` flag; when set, joins are *pending* until a Game
  Manager/Administrator approves (satisfies UC‑6's approval flow without
  forcing it on every game — reconciles UC‑6 with TC‑23 and the traceability
  file).
- Each game has an optional `roster_capacity`; joining (or approving) a full
  roster is refused (TC‑26).
- **Promotion (TC‑32):** a Game Manager adds an active Community Member of the
  game to a team → they become a Player. A user may be on at most one team per
  game. Removing them from the team returns them to Community Member.
- A Player cannot leave a game's roster while on one of its teams; the Game
  Manager must remove them from the team first (keeps team data consistent).
- **Shell team** = a team with no members. Only shell teams may be deleted
  (TC‑29); a team with members must be emptied first.
- Games/communities are created and edited by Administrators (fills the
  unspecified "Manage Game Communities" use case).

## D4. Accounts and authentication (gaps D-login, D-domain, NFREQ7)
- Registration fields: full name, username, official email, password (+confirm).
- "Official" emails are those whose domain equals, or is a subdomain of, a
  domain in `OFFICIAL_EMAIL_DOMAINS` (env var, comma-separated; default
  `school.edu`).
- Emails and usernames are unique, case-insensitively.
- Verification uses a signed, time-limited token (48 h) e-mailed through
  Django's mail framework (console backend in development, SMTP via env vars).
  Clicking the link verifies **and signs the user in**, landing on the
  dashboard, so onboarding is three screens (NFREQ7, TC‑5).
- Unverified, suspended and deactivated accounts cannot sign in; each gets a
  specific message. Active sessions of a suspended/deactivated account are
  ended on their next request.
- Users may sign in with username or email. Passwords follow Django's standard
  validators.
- Users can edit their own full name (Manage Account).

## D5. Profiles (UC‑2, conflict B5, C-first-name)
- Own profile: full name, username, email, game rosters, teams, Discord, roles.
- Another user's profile: first name (first word of full name), username,
  game rosters, Discord username. Their **teams are only listed if the viewer
  may see that team** (admin, the game's GM, or a teammate) — honours userContext Q4.
- Database failures render an error page (HTTP 503) instead of partial data (TC‑8).

## D6. Dashboard (FREQ10)
Upcoming visible events and schedules, the user's game rosters and teams with
VOD/statistics links, pending roster requests for Game Managers, and admin
shortcuts. Load failures render an error page (UC‑3 extension).

## D7. Events vs. schedules (C-events, FREQ11–19, FREQ38, conflict B4)
- **Event** (FREQ11–15): name, date, start, end, location, optional game/team,
  visibility. Created, edited (FREQ14 inferred) and deleted by Administrators
  (any event, including program-wide events with no game) and Game Managers
  (only events for their assigned games).
- **Game schedule** (FREQ16–17): a match or practice entry for a game,
  optionally a team, with opponent and location.
- **Visibility (FREQ19, TC‑49):** `public` (all signed-in users),
  `community` (members of that game, its GMs, admins), `team` (that team's
  players, the game's GMs, admins). Matches default to community, practices to team.
- The calendar requires sign-in (UC‑12 precondition); no anonymous calendar.
- **Conflicts (TC‑20):** two schedule entries conflict when their times
  overlap on the same date **and** they share a team, or share a (non-empty,
  case-insensitive) location, or are both game-wide entries of the same game.
  Conflicting entries are rejected with a warning listing the clash.

## D8. External integrations (conflicts B2, B3)
All providers sit behind small interfaces in `integrations/`, selected by settings:
- **Email:** Django mail backends.
- **Calendar (FREQ40):** schedules are saved first; then the configured
  calendar provider is called and the result stored on the entry
  (`synced` / `failed` + message). A failure is shown to the manager and never
  reported as success (TC‑21); a "retry sync" action is available. The default
  provider is local (no credentials). Every user also gets a personal,
  token-protected **iCalendar (.ics) feed** of what they are allowed to see,
  which subscribes into Google/Outlook/Apple calendars — a real integration
  that needs no API keys.
- **Discord (FREQ42):** OAuth2 authorization-code flow. If
  `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` are set, the real Discord API is
  used; otherwise a local authorization page stands in for Discord. Denied or
  failed authorization shows an error and links nothing (TC‑46). Users can unlink.

## D9. Team analytics (FREQ29–31, FREQ43, conflict B6)
- **VODs** are links to supported hosts (YouTube, Twitch, Vimeo) over HTTPS;
  anything else is rejected as unsupported (TC‑36). No media storage is needed.
- **Team data** is a CSV upload (≤ 1 MB, UTF‑8) with required columns
  `match_date, opponent, result, score_for, score_against` (`result` ∈ W/L/D).
  The whole file is validated before anything is saved; one bad row rejects the
  upload with row-level errors.
- **Statistics (FREQ43)** recomputed and stored after every upload: matches
  played, wins, losses, draws, win rate, average score for/against, point
  differential.
- **Comments (FREQ31):** Game Managers/Admins comment on an upload or VOD;
  Players read them. Authors and admins can delete comments.

## D10. Role management and moderation (UC‑9, UC‑10, conflict B7)
- Granting Game Manager requires choosing a game; revoking is per game.
- Invalid role changes are rejected: granting to an unverified or inactive
  account, a duplicate assignment, a missing game, or revoking/removing the last
  active Administrator.
- **Suspend** is reversible (reactivate). **Remove** deactivates the account
  and strips its memberships, team places and roles; the record is kept for
  audit. Administrators cannot moderate themselves.
- Every role change and moderation action is written to an **audit log**.

## D11. Desktop / responsive (NFREQ5, conflict B8)
The layout targets desktop (≥ 1024 px) with a full navigation bar per role.
A single CSS breakpoint keeps it usable on narrow screens; mobile is not a
tested requirement.
