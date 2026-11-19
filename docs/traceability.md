# Requirements traceability

Every requirement from the original CSV (FREQ1–46, NFREQ1–8) and the baseline additions (FREQ47–66, NFREQ9–16),
where it is implemented and how it is verified. Status: ✅ done and tested · 🟡 done, partly verified (see note).

Test locations: **U** = `tests/unit`, **I** = `tests/integration`, **E** = `tests/e2e`.

## Functional

| ID | Requirement (short) | Status | Implementation | Verified by |
|---|---|---|---|---|
| FREQ1 | Students create accounts with school email, name, username, password | ✅ | `services/account-service.ts` `register`; `/register` | I `account-service.test.ts`; E `account.spec.ts` |
| FREQ4 | Email verification | ✅ | `account-service.ts` `verifyEmail`, `resendVerification`; `/verify-email`, `/check-email` | I `account-service.test.ts`; E `account.spec.ts` |
| FREQ6 | View own profile | ✅ | `/profile` | E `account.spec.ts` |
| FREQ7 | Profile shows joined rosters | ✅ | `community-service.ts` `getMemberships`; `components/memberships.tsx` | E `teams.spec.ts` |
| FREQ8 | Discord username on profile | ✅ | `discord-service.ts`; `/profile` | I `moderation-integrations.test.ts` |
| FREQ9 | View other profiles (first name, username, rosters, Discord) | ✅ | `/users/[username]`; PII rule `profile.viewPii` | I `account-service.test.ts`; U `policy-matrix.test.ts`; E `account.spec.ts` |
| FREQ10 | Dashboard after login | ✅ | `dashboard-service.ts`; `/dashboard` | E `schedule.spec.ts`, `account.spec.ts` |
| FREQ11 | GMs/Admins create named events | ✅ | `schedule-service.ts` `createEvent`; `/manage/schedule` | I `calendar.test.ts` |
| FREQ12 | Event date, start, end | ✅ | same; time-zone handling `lib/time.ts` | I `calendar.test.ts`; U `time.test.ts` |
| FREQ13 | Event location | ✅ | same | I `calendar.test.ts` |
| FREQ15 | Delete events | ✅ | `deleteEvent`; `/manage/schedule/[kind]/[id]` | I `calendar.test.ts` |
| FREQ16 | Create game schedules | ✅ | `createScheduleEntry` | I `calendar.test.ts`; E `schedule.spec.ts` |
| FREQ17 | Edit game schedules | ✅ | `updateScheduleEntry` | I `calendar.test.ts` |
| FREQ18 | All users view game schedules | ✅ | `calendar-service.ts` `listCalendarItems`; `/calendar`, `/` | I `calendar.test.ts`; E `schedule.spec.ts` |
| FREQ19 | All users view upcoming event details | ✅ | `getCalendarItem`; `/schedule/[kind]/[id]` | I `calendar.test.ts` |
| FREQ20 | Community Members join rosters | ✅ | `roster-service.ts` `requestToJoin` + GM approval (UC-6) | I `teams-and-rosters.test.ts`; E `teams.spec.ts` |
| FREQ22 | Community Members leave rosters | ✅ | `leaveTeam` | I `teams-and-rosters.test.ts` |
| FREQ26 | GMs create named shell teams | ✅ | `team-service.ts` `createTeam`; `/manage` | I `teams-and-rosters.test.ts`; E `teams.spec.ts` |
| FREQ27 | GMs modify teams | ✅ | `updateTeam`; `/manage/teams/[id]` | I `teams-and-rosters.test.ts` |
| FREQ28 | GMs delete shell teams | ✅ | `deleteTeam` (shell only) | I `teams-and-rosters.test.ts` |
| FREQ29 | GMs upload VODs | ✅ | `vod-service.ts` (links, per baseline AD9) | I `team-data.test.ts`; E `team-data.spec.ts` |
| FREQ30 | GMs upload team data | ✅ | `stats-service.ts` `createSheet`; `/teams/[id]/stats/new` | I `team-data.test.ts`; E `team-data.spec.ts` |
| FREQ31 | GMs analyze data with comments for players | ✅ | `comment-service.ts` | I `team-data.test.ts`; E `team-data.spec.ts` |
| FREQ32 | Admins grant GM role | ✅ | `role-service.ts` `assignGameManager` (per game) | I `roles.test.ts`; E `teams.spec.ts` |
| FREQ33 | Admins revoke GM role | ✅ | `unassignGameManager` | I `roles.test.ts` |
| FREQ34 | Admins grant Admin role | ✅ | `grantAdmin` | I `roles.test.ts` |
| FREQ36 | Admins suspend accounts | ✅ | `moderation-service.ts` `suspendUser` | I `moderation-integrations.test.ts`; E `moderation.spec.ts` |
| FREQ37 | Admins remove accounts | ✅ | `removeUser` (anonymize) | I `moderation-integrations.test.ts` |
| FREQ38 | Calendar view for the game's members | ✅ | `/calendar` "My games & teams", `MonthGrid` | I `calendar.test.ts`; E `schedule.spec.ts` |
| FREQ40 | External calendar integration | ✅ | iCal feed `feed-service.ts`, `/api/calendar/[token].ics` | I `moderation-integrations.test.ts`; U `ics.test.ts`; E `moderation.spec.ts` |
| FREQ42 | Discord usernames appear in the app | 🟡 | OAuth `/api/discord/connect`, `/callback`; `discord-service.ts` | I (Discord API mocked). Not tested against real Discord: needs an OAuth app's client id/secret. |
| FREQ43 | Calculated team statistics per game | ✅ | `lib/formula.ts`; `computeRow` | U `formula.test.ts`; I `team-data.test.ts`; E `team-data.spec.ts` |
| FREQ44 | GM team management page | ✅ | `/manage`, `/manage/teams/[id]` | E `teams.spec.ts` |
| FREQ45 | Players view VODs | ✅ | `/teams/[id]/vods`, embeds `lib/vod.ts` | I `team-data.test.ts`; E `team-data.spec.ts` |
| FREQ46 | Players view team statistics | ✅ | `/teams/[id]/stats` | I `team-data.test.ts`; E `team-data.spec.ts` |
| FREQ47 | Log in / log out | ✅ | `login`, `logoutAction` | I, E `account` |
| FREQ48 | Password reset by email | ✅ | `requestPasswordReset`, `resetPassword` | I, E `account` |
| FREQ49 | Edit name and username | ✅ | `updateOwnProfile` | I, E `account` |
| FREQ50 | Admins manage games | ✅ | `game-service.ts`; `/admin/games` | I `teams-and-rosters.test.ts`; E `teams.spec.ts` |
| FREQ51 | Join/leave game communities | ✅ | `community-service.ts`; `/games` | I, E |
| FREQ52 | GM role scoped to a game | ✅ | `GameManagerAssignment`; policy | U `policy-matrix.test.ts`; I `roles.test.ts` |
| FREQ53 | Revoke Admin; last admin protected | ✅ | `revokeAdmin` (advisory lock) | I `roles.test.ts` (incl. concurrent) |
| FREQ54 | Edit events | ✅ | `updateEvent` | I `calendar.test.ts` |
| FREQ55 | Roster requests routed to GMs | ✅ | `decideRequest` | I, E |
| FREQ56 | GM adds/removes players directly | ✅ | `addPlayer`, `removePlayer` | I `teams-and-rosters.test.ts` |
| FREQ57 | Max roster size enforced | ✅ | row lock in `roster-service.ts` | I (incl. concurrent approvals) |
| FREQ58 | Team status shell/active/archived | ✅ | `team-service.ts` | I `teams-and-rosters.test.ts` |
| FREQ59 | Lift suspensions (incl. timed) | ✅ | `liftSuspension`, `refreshSuspension` | I, E |
| FREQ60 | Schedule conflict warning | ✅ | `findConflicts` | I `calendar.test.ts`; E `schedule.spec.ts` |
| FREQ61 | Admin-defined stats per game | ✅ | `stats-service.ts` definitions; `/admin/games/[id]/stats` | I, E |
| FREQ62 | Players reply to GM comments | ✅ | `addComment` with parent | I, E |
| FREQ63 | Announcements | ✅ | `announcement-service.ts`; `/announcements` | I, E |
| FREQ64 | Visibility public/members/team | ✅ | `calendar-service.ts` filters | I `calendar.test.ts`; E `schedule.spec.ts` |
| FREQ65 | Private, regenerable iCal URL | ✅ | `feed-service.ts` | I, E |
| FREQ66 | Unlink Discord | ✅ | `unlinkDiscord` | I |

## Non-functional

| ID | Requirement | Status | How | Evidence |
|---|---|---|---|---|
| NFREQ1 | ≥200 concurrent users | ✅ | `scripts/load-test.ts` (`npm run test:load`) | 200 users, 5 s think time: 0 errors, p95 198 ms. Stress (1 s think time): 0 errors, p95 3.3 s on one Node process. See `docs/test-report.md`. |
| NFREQ4 | Role-based access control | ✅ | `server/authz/policy.ts` (single `can()`), services authorize every call | U matrix (all actions × 7 personas); I "unauthorized" cases; E denial checks |
| NFREQ5 | Complete desktop interface | ✅ | All features reachable on desktop; also usable at phone width | E suite (desktop Chrome); screenshots |
| NFREQ7 | Onboarding within 5 minutes | ✅ | 4-field form + email link | E `account.spec.ts` asserts < 5 min (actual: about 1 s automated) |
| NFREQ8 | Calendar for logged-out visitors within 3 s | ✅ | Cached public agenda on `/` | E `schedule.spec.ts` asserts < 3 s |
| NFREQ9 | Password hashing, HTTPS, secure cookies | ✅ | argon2id; HttpOnly/SameSite cookies (Secure in production); HSTS + CSP headers in `next.config.ts` | I (hash format); headers active in E runs |
| NFREQ10 | Central policy layer with matrix tests | ✅ | `policy.ts`; a test fails if an action has no matrix rows | U `policy-matrix.test.ts` |
| NFREQ11 | Student PII exposure limited | ✅ | `profile.viewPii` rule | U, I, E |
| NFREQ12 | Audit log | ✅ | `AuditLog`; role, roster, team, moderation actions | I (audit assertions) |
| NFREQ13 | Daily backups, 14-day retention | 🟡 | `scripts/backup.sh` | Backup + restore verified once, row counts match. The daily schedule (cron) is set up at deployment. |
| NFREQ14 | WCAG 2.1 AA | ✅ | Labels, landmarks, focus, contrast tokens | E `accessibility.spec.ts` (axe-core, 21 pages × light/dark, 0 violations). Automated checks only; a manual screen-reader pass is recommended. |
| NFREQ15 | Latest Chrome, Edge, Firefox, Safari | 🟡 | Playwright projects behind `E2E_ALL_BROWSERS=1`; CI installs all | Chromium verified here. Firefox/WebKit/Edge run only in CI (not installed in the build sandbox). |
| NFREQ16 | Rate limiting on auth | ✅ | `server/rate-limit.ts` (Postgres, multi-instance safe) | I `rate-limit.test.ts` (incl. concurrent burst) |

## Use cases → tests

| Use case | Main flow | Extensions |
|---|---|---|
| UC-1 Create Account | E `account.spec.ts` | Email in use, invalid info: I + E |
| UC-2 View Profile | E `account.spec.ts` | Retrieval failure → error boundary |
| UC-3 View Dashboard | E `schedule.spec.ts` | Error boundary `(app)/error.tsx` |
| UC-4 Events | I `calendar.test.ts` | Invalid info, unauthorized: I |
| UC-5 Schedules | E `schedule.spec.ts` | Conflict: I + E; calendar sync failure: n/a (pull-based iCal feed, AD8) |
| UC-6 Join/Leave Rosters | E `teams.spec.ts` | Capacity, restricted access: I + E |
| UC-7 Teams | E `teams.spec.ts` | Unauthorized game, invalid info: I |
| UC-8 Team Data | E `team-data.spec.ts` | Invalid upload (bad link/number), unassigned team: I + E |
| UC-9 Roles | E `teams.spec.ts` | Invalid role config (inactive/unverified, last admin): I |
| UC-10 Moderation | E `moderation.spec.ts` | Non-admin attempt: I |
| UC-11 Discord | I (mocked Discord API) | Auth failure: I |
| UC-12 View Events | E `schedule.spec.ts` | Empty schedule message: UI `Agenda` |
| UC-13 VODs & Stats | E `team-data.spec.ts` | Other team denied: I + E; no VODs message: UI |
