UC-1: Create Account

Related Requirements: FREQ1, FREQ4, NFREQ7

Primary Actors: User

Actor's Goals: Create an account to access the esports management platform.

Secondary Actors: Database, Email Service

Preconditions:

* The User is not currently authenticated.
* The User has access to the registration page.

Success End Condition:

* A new user account is successfully created and stored in the system.

Failed End Condition:

* The account is not created and the User remains unauthenticated.

Flow of Events for Main Success Scenario:

1. → User selects the account registration option.
2. ← System displays the registration form.
3. → User enters required registration information.
4. ← System validates the submitted information.
5. ← System creates the user account.
6. ← System stores the account information in the database.
7. ← System confirms successful account creation.

Flow of Events for Extensions:

Email already in use

1. → User submits registration information.
2. ← System detects an existing account with the same email.
3. ← System displays an error message requesting a different email.

Invalid registration information

1. → User submits incomplete or invalid information.
2. ← System rejects the submission.
3. ← System displays validation errors.

UC-2: View Profile Information

Related Requirements: FREQ6, FREQ7, FREQ8, FREQ9

Primary Actors: User

Actor's Goals: View personal profile and account-related information.

Secondary Actors: Database

Preconditions:

* The User is authenticated.

Success End Condition:

* The User successfully views their profile information.

Failed End Condition:

* The profile information cannot be retrieved.

Flow of Events for Main Success Scenario:

1. → User navigates to the profile page.
2. ← System retrieves the User's profile information.
3. ← System displays the profile details.

Flow of Events for Extensions:

Profile retrieval failure

1. → User requests profile information.
2. ← System fails to retrieve profile data.
3. ← System displays an error message.

UC-3: View Dashboard

Related Requirements: FREQ10

Primary Actors: User

Actor's Goals: Access a centralized dashboard containing relevant platform information.

Secondary Actors: Database

Preconditions:

* The User is authenticated.

Success End Condition:

* The dashboard is successfully displayed.

Failed End Condition:

* The dashboard cannot be loaded.

Flow of Events for Main Success Scenario:

1. → User accesses the dashboard.
2. ← System retrieves dashboard data.
3. ← System displays the dashboard content.

Flow of Events for Extensions:

Dashboard loading failure

1. → User requests the dashboard.
2. ← System encounters an error retrieving dashboard data.
3. ← System displays an error message.

UC-4: Create and Manage Events

Related Requirements: FREQ11, FREQ12, FREQ13, FREQ15

Primary Actors: Game Manager, Administrator

Actor's Goals: Create, update, and manage esports-related events.

Secondary Actors: Database

Preconditions:

* The actor is authenticated.
* The actor has Game Manager or Administrator permissions.

Success End Condition:

* Event information is successfully created or updated.

Failed End Condition:

* Event changes are not saved.

Flow of Events for Main Success Scenario:

1. → Game Manager or Administrator selects event management.
2. ← System displays existing events and management options.
3. → Game Manager or Administrator creates or edits an event.
4. ← System validates the event information.
5. ← System saves the event details.
6. ← System confirms the successful update.

Flow of Events for Extensions:

Invalid event information

1. → Game Manager or Administrator submits incomplete event data.
2. ← System rejects the submission.
3. ← System displays validation errors.

Unauthorized access attempt

1. → User without proper permissions attempts to manage events.
2. ← System denies access.
3. ← System displays an authorization error.

UC-5: Create and Manage Game Schedules

Related Requirements: FREQ16, FREQ17, FREQ18, FREQ38, FREQ40, NFREQ8

Primary Actors: Game Manager, Administrator

Actor's Goals: Create and maintain schedules for games and events.

Secondary Actors: Database, Calendar Service

Preconditions:

* The actor is authenticated.
* The actor has Game Manager or Administrator permissions.

Success End Condition:

* Schedule information is successfully saved and updated.

Failed End Condition:

* Schedule changes are not saved.

Flow of Events for Main Success Scenario:

1. → Game Manager or Administrator accesses schedule management.
2. ← System displays schedule management tools.
3. → Game Manager or Administrator creates or edits a schedule.
4. ← System validates the schedule information.
5. ← System stores the schedule data.
6. ← System updates connected calendar integrations.
7. ← System confirms successful schedule management.

Flow of Events for Extensions:

Schedule conflict detected

1. → Game Manager or Administrator submits a conflicting schedule.
2. ← System detects the conflict.
3. ← System displays a scheduling conflict warning.

Calendar integration failure

1. ← System attempts to update external calendar services.
2. ← Calendar Service fails to respond.
3. ← System displays an integration failure message.

UC-6: Join or Leave Rosters

Related Requirements: FREQ20, FREQ22

Primary Actors: Community Member

Actor's Goals: Join or leave rosters associated with esports teams.

Secondary Actors: Database, Game Manager

Preconditions:

* The Community Member is authenticated.
* The Community Member belongs to a game community.

Success End Condition:

* The roster membership is successfully updated.

Failed End Condition:

* The roster membership remains unchanged.

Flow of Events for Main Success Scenario:

1. → Community Member requests to join or leave a roster.
2. ← System forwards the request for processing.
3. ← Game Manager approves the roster change.
4. ← System updates the roster membership.
5. ← System confirms the roster update.

Flow of Events for Extensions:

Roster capacity reached

1. → Community Member requests to join a roster.
2. ← System detects that the roster is full.
3. ← System denies the request.

Unauthorized roster access

1. → Community Member attempts to access a restricted roster.
2. ← System denies access based on role or team restrictions.

UC-7: Create and Manage Teams

Related Requirements: FREQ26, FREQ27, FREQ28, FREQ44

Primary Actors: Game Manager

Actor's Goals: Create and maintain teams for assigned games.

Secondary Actors: Database

Preconditions:

* The Game Manager is authenticated.
* The Game Manager is assigned to the relevant game.

Success End Condition:

* Team information is successfully created or updated.

Failed End Condition:

* Team changes are not saved.

Flow of Events for Main Success Scenario:

1. → Game Manager accesses team management.
2. ← System displays team management tools.
3. → Game Manager creates or edits a team.
4. ← System validates team information.
5. ← System saves the team details.
6. ← System confirms successful team management.

Flow of Events for Extensions:

Unauthorized game management

1. → Game Manager attempts to manage a team outside assigned games.
2. ← System denies access.
3. ← System displays an authorization error.

Invalid team information

1. → Game Manager submits incomplete team data.
2. ← System rejects the submission.
3. ← System displays validation errors.

UC-8: Upload and Analyze Team Data

Related Requirements: FREQ29, FREQ30, FREQ31, FREQ43

Primary Actors: Game Manager

Actor's Goals: Upload VODs and manage team performance data.

Secondary Actors: Database

Preconditions:

* The Game Manager is authenticated.
* The Game Manager manages the relevant team.

Success End Condition:

* Team data and VOD information are successfully stored.

Failed End Condition:

* Team data is not uploaded or updated.

Flow of Events for Main Success Scenario:

1. → Game Manager accesses team analytics management.
2. ← System displays upload and analytics options.
3. → Game Manager uploads VODs or updates statistics.
4. ← System validates uploaded data.
5. ← System stores the uploaded information.
6. ← System confirms successful upload and analysis update.

Flow of Events for Extensions:

Invalid file upload

1. → Game Manager uploads an unsupported file.
2. ← System rejects the upload.
3. ← System displays an upload error.

Unauthorized team access

1. → Game Manager attempts to manage data for an unassigned team.
2. ← System denies access.
3. ← System displays an authorization error.

UC-9: Manage User Roles

Related Requirements: FREQ32, FREQ33, FREQ34, NFREQ4

Primary Actors: Administrator

Actor's Goals: Assign and manage user roles within the platform.

Secondary Actors: Database

Preconditions:

* The Administrator is authenticated.

Success End Condition:

* User role assignments are successfully updated.

Failed End Condition:

* Role changes are not applied.

Flow of Events for Main Success Scenario:

1. → Administrator accesses user role management.
2. ← System displays users and available roles.
3. → Administrator selects a user and modifies role assignments.
4. ← System validates the requested role changes.
5. ← System updates the user roles.
6. ← System confirms successful role management.

Flow of Events for Extensions:

Invalid role assignment

1. → Administrator submits an invalid role configuration.
2. ← System rejects the changes.
3. ← System displays validation errors.

UC-10: Moderate User Accounts

Related Requirements: FREQ36, FREQ37, NFREQ4

Primary Actors: Administrator

Actor's Goals: Moderate and control user account access.

Secondary Actors: Database

Preconditions:

* The Administrator is authenticated.

Success End Condition:

* The targeted account is successfully moderated.

Failed End Condition:

* The moderation action is not applied.

Flow of Events for Main Success Scenario:

1. → Administrator accesses account moderation tools.
2. ← System displays user account information.
3. → Administrator performs a moderation action.
4. ← System validates the moderation request.
5. ← System applies the moderation action.
6. ← System confirms successful moderation.

Flow of Events for Extensions:

Unauthorized moderation attempt

1. → Non-administrator attempts to moderate accounts.
2. ← System denies access.
3. ← System displays an authorization error.

UC-11: Integrate Discord Accounts

Related Requirements: FREQ42

Primary Actors: User

Actor's Goals: Connect a Discord account with the platform.

Secondary Actors: Discord API

Preconditions:

* The User is authenticated.
* The User has a valid Discord account.

Success End Condition:

* The Discord account is successfully linked.

Failed End Condition:

* The Discord account is not linked.

Flow of Events for Main Success Scenario:

1. → User selects Discord integration settings.
2. ← System redirects the User to Discord authentication.
3. → User authorizes the integration.
4. ← Discord API returns authentication approval.
5. ← System links the Discord account.
6. ← System confirms successful integration.

Flow of Events for Extensions:

Discord authentication failure

1. → User attempts Discord authorization.
2. ← Discord API rejects authentication.
3. ← System displays an authentication error.

UC-12: View Events and Schedules

Related Requirements: FREQ18, FREQ19, FREQ38

Primary Actors: User

Actor's Goals: View upcoming events and schedules.

Secondary Actors: Database

Preconditions:

* The User is authenticated.

Success End Condition:

* Event and schedule information is successfully displayed.

Failed End Condition:

* Event information cannot be retrieved.

Flow of Events for Main Success Scenario:

1. → User accesses events and schedules.
2. ← System retrieves event and schedule data.
3. ← System displays the information.

Flow of Events for Extensions:

No scheduled events available

1. → User accesses events and schedules.
2. ← System finds no scheduled events.
3. ← System displays an empty schedule message.

UC-13: View Team VODs and Statistics

Related Requirements: FREQ45, FREQ46

Primary Actors: Player

Actor's Goals: View team VODs and performance statistics.

Secondary Actors: Database

Preconditions:

* The Player is authenticated.
* The Player belongs to a team.

Success End Condition:

* Team VODs and statistics are successfully displayed.

Failed End Condition:

* The requested information cannot be retrieved.

Flow of Events for Main Success Scenario:

1. → Player accesses team VODs and statistics.
2. ← System verifies team membership permissions.
3. ← System retrieves VOD and statistics data.
4. ← System displays the requested information.

Flow of Events for Extensions:

Unauthorized team access

1. → Player attempts to access another team's data.
2. ← System denies access based on role and team restrictions.

No VODs available

1. → Player requests team VODs.
2. ← System finds no uploaded VODs.
3. ← System displays a no-content message.
