# Traceability Matrix

Requirement → use case → design decision → implementation → automated tests.
Every test case TC-1…TC-57 in `docs/source/testCases.md` has at least one
automated test (enforced by `tests/test_completion.py::test_every_test_case_is_automated`).
Requirement texts were not supplied; meanings are inferred from the use cases
and test cases that cite them (see `docs/DECISIONS.md`).

## Requirements

| Requirement | Use case | Decision | Implementation | Tests |
|---|---|---|---|---|
| FREQ1, FREQ4 – registration with official email, verification | UC-1 | D4 | `accounts/forms.py` (RegistrationForm, is_official_email), `accounts/views.py` (register, verify_email), `accounts/tokens.py` | `test_auth.py` TC-1–TC-5 |
| NFREQ7 – onboarding ≤ 5 min | UC-1 | D4 | verification link signs the user in → dashboard | `test_auth.py::test_tc05_*` |
| FREQ6–FREQ8 – own profile, rosters, Discord | UC-2 | D5 | `accounts/views.py::my_profile`, `templates/accounts/profile.html` | `test_profiles_admin.py` TC-6, TC-8 |
| FREQ9 – other users' profiles | UC-2 | D5 | `accounts/views.py::public_profile` | `test_profiles_admin.py` TC-7 |
| FREQ10 – dashboard landing page | UC-3 | D6 | `core/views.py::dashboard` | `test_auth.py` TC-9, TC-10 |
| FREQ11–FREQ13, FREQ14 (inferred: edit), FREQ15 – events | UC-4 | D7 | `scheduling/forms.py::EventForm`, `scheduling/views.py` (event_*) | `test_calendar.py` TC-11–TC-15 |
| FREQ16–FREQ17 – create/edit game schedules, conflicts | UC-5 | D7 | `scheduling/forms.py::ScheduleForm, find_conflicts` | `test_calendar.py` TC-16–TC-20 |
| FREQ18, FREQ38 – calendar views | UC-5, UC-12 | D7 | `scheduling/views.py::calendar_view` | `test_calendar.py` TC-16, TC-22, TC-47–TC-49 |
| FREQ19 – event visibility | UC-12 | D7 | `core/permissions.py::_visibility_filter` | `test_calendar.py` TC-47, TC-49 |
| FREQ40 – external calendar integration | UC-5 | D8 | `integrations/calendar.py`, iCalendar feed `scheduling/views.py::calendar_feed` | `test_calendar.py` TC-16, TC-21 |
| FREQ20, FREQ22 – join/leave roster, capacity, approval | UC-6 | D3 | `teams/services.py` (join_roster, leave_roster, approve_request) | `test_teams.py` TC-23–TC-26 |
| FREQ26–FREQ28, FREQ44 – team CRUD in assigned game | UC-7 | D3 | `teams/views.py` (manage_teams, edit_team, delete_team) | `test_teams.py` TC-27–TC-31 |
| Promotion: Community Member → Player | UC-6/7/13 | D2, D3 | `teams/services.py::add_player` | `test_teams.py` TC-32 |
| FREQ29 – VODs | UC-8 | D9 | `analytics/views.py::VODForm, manage_analytics` | `test_analytics.py` TC-33, TC-36 |
| FREQ30, FREQ43 – team data upload & statistics | UC-8 | D9 | `analytics/services.py` (parse_team_csv, recalculate) | `test_analytics.py` TC-34, TC-36 |
| FREQ31 – manager comments | UC-8 | D9 | `analytics/models.py::ManagerComment` | `test_analytics.py` TC-35 |
| FREQ32–FREQ34 – grant/revoke roles | UC-9 | D10 | `accounts/services.py`, `accounts/manage_views.py` | `test_profiles_admin.py` TC-38–TC-41 |
| FREQ36, FREQ37 – suspend/remove accounts | UC-10 | D10 | `accounts/services.py`, `accounts/middleware.py` | `test_profiles_admin.py` TC-42–TC-44 |
| FREQ42 – Discord linking | UC-11 | D8 | `integrations/discord.py`, `accounts/views.py` (discord_*) | `test_profiles_admin.py` TC-45, TC-46 |
| FREQ45, FREQ46 – player VODs/statistics | UC-13 | D2 | `analytics/views.py` (team_vods, team_stats) | `test_analytics.py` TC-50–TC-53 |
| NFREQ1 – 200 concurrent users | UC-1/3/12 | D1 | SQLite WAL + IMMEDIATE / PostgreSQL | `test_completion.py` TC-56 |
| NFREQ4 – role & resource authorization | all | D2 | `core/permissions.py` | every `*_prevent_*`/authorization test; TC-54, TC-55 |
| NFREQ5 – desktop interface | all | D11 | `templates/base.html`, `static/css/hub.css`, `core/context_processors.py` | `test_completion.py` TC-57 |
| NFREQ8 – calendar < 3 s | UC-5/12 | D1 | server-rendered, indexed queries | `test_calendar.py` TC-22 |

## Test cases

| TC | Test(s) |
|---|---|
| TC-1–TC-5 | `tests/test_auth.py::test_tc01…test_tc05_*` |
| TC-6–TC-8 | `tests/test_profiles_admin.py::test_tc06…test_tc08_*` |
| TC-9, TC-10 | `tests/test_auth.py::test_tc09_*, test_tc10_*` |
| TC-11–TC-22 | `tests/test_calendar.py::test_tc11…test_tc22_*` |
| TC-23–TC-32 | `tests/test_teams.py::test_tc23…test_tc32_*` |
| TC-33–TC-37 | `tests/test_analytics.py::test_tc33…test_tc37_*` |
| TC-38–TC-46 | `tests/test_profiles_admin.py::test_tc38…test_tc46_*` |
| TC-47–TC-49 | `tests/test_calendar.py::test_tc47…test_tc49_*` |
| TC-50–TC-53 | `tests/test_analytics.py::test_tc50…test_tc53_*` |
| TC-54–TC-57 | `tests/test_completion.py::test_tc54…test_tc57_*` |

## Additional behaviour tested (gaps from the analysis)

Login with username/email, unverified/suspended/removed sign-in refusal, logout,
expired/tampered verification links, resend verification, event editing,
schedule end-before-start, back-to-back schedules, calendar sync retry, roster
approval/denial, removing players, one-team-per-game, duplicate team names,
last-administrator protection, self-moderation refusal, Discord state forgery
and unlinking, CSV partial-failure atomicity, upload removal recalculation,
comment permissions, multiple simultaneous roles.
