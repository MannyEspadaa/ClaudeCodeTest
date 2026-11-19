TC-1: Create Account with Valid Official Email

Related Use Cases:
UC-1

Related Requirements:
FREQ1, FREQ4, NFREQ7

Priority:
High

Test Type:
Functional

Primary Actor:
User

Preconditions:

* User is not authenticated.
* User has access to the registration page.
* User has a valid official email address.

Test Steps:

1. User opens the registration page.
2. User enters full name, username, official email address, and password.
3. User submits the registration form.
4. System validates the submitted registration information.
5. System creates the account.
6. System sends an email verification message to the submitted email address.
7. User completes email verification.

Expected Result:
The system creates the User account, stores the account information, sends a verification email, and marks the account as verified after the User completes verification.

TC-2: Reject Account Creation with Non-Official Email

Related Use Cases:
UC-1

Related Requirements:
FREQ1, FREQ4

Priority:
High

Test Type:
Validation

Primary Actor:
User

Preconditions:

* User is not authenticated.
* User has access to the registration page.

Test Steps:

1. User opens the registration page.
2. User enters full name, username, non-official email address, and password.
3. User submits the registration form.
4. System validates the email address.

Expected Result:
The system rejects the registration, displays a validation error, and does not create the account.

TC-3: Reject Account Creation with Missing Required Fields

Related Use Cases:
UC-1

Related Requirements:
FREQ1

Priority:
High

Test Type:
Validation

Primary Actor:
User

Preconditions:

* User is not authenticated.
* User has access to the registration page.

Test Steps:

1. User opens the registration page.
2. User leaves one or more required fields blank.
3. User submits the registration form.
4. System validates the submitted information.

Expected Result:
The system rejects the submission, displays validation errors for missing fields, and does not create an account.

TC-4: Reject Duplicate Email Registration

Related Use Cases:
UC-1

Related Requirements:
FREQ1, FREQ4

Priority:
Medium

Test Type:
Negative

Primary Actor:
User

Preconditions:

* An account already exists using the submitted official email address.
* User is not authenticated.

Test Steps:

1. User opens the registration page.
2. User enters registration information using an email address already associated with an account.
3. User submits the registration form.
4. System checks whether the email is already in use.

Expected Result:
The system rejects the registration, displays an error indicating the email is already in use, and does not create a duplicate account.

TC-5: Complete Onboarding Within Required Time

Related Use Cases:
UC-1

Related Requirements:
FREQ1, FREQ4, NFREQ7

Priority:
Medium

Test Type:
Boundary

Primary Actor:
User

Preconditions:

* User is not authenticated.
* User has valid registration information.
* User has access to the submitted email inbox.

Test Steps:

1. User begins account registration.
2. User enters all required registration information.
3. User submits the registration form.
4. System creates the account and sends the verification email.
5. User verifies the account.
6. System completes onboarding.

Expected Result:
The User is able to complete onboarding within 5 minutes under normal system conditions.

TC-6: View Own Profile Information

Related Use Cases:
UC-2

Related Requirements:
FREQ6, FREQ7, FREQ8

Priority:
High

Test Type:
Functional

Primary Actor:
User

Preconditions:

* User is authenticated.
* User has an account with full name, username, and email.
* User may or may not have joined game rosters.
* User may or may not have connected Discord.

Test Steps:

1. User navigates to their profile page.
2. System retrieves the User profile information.
3. System retrieves joined roster information.
4. System checks whether a Discord username is connected.
5. System displays the profile page.

Expected Result:
The system displays the User’s full name, username, account email, joined game rosters, and Discord username if connected.

TC-7: View Another User Profile

Related Use Cases:
UC-2

Related Requirements:
FREQ9

Priority:
Medium

Test Type:
Functional

Primary Actor:
User

Preconditions:

* User is authenticated.
* Another user profile exists.

Test Steps:

1. User navigates to another user’s profile.
2. System retrieves the selected profile.
3. System displays the available public profile information.

Expected Result:
The system displays the other user’s first name, username, joined game rosters, and Discord name if applicable.

TC-8: Handle Profile Retrieval Failure

Related Use Cases:
UC-2

Related Requirements:
FREQ6, FREQ7, FREQ8, FREQ9

Priority:
Medium

Test Type:
Negative

Primary Actor:
User

Preconditions:

* User is authenticated.
* Profile data cannot be retrieved due to a system or database issue.

Test Steps:

1. User navigates to a profile page.
2. System attempts to retrieve profile information.
3. System fails to retrieve the profile data.

Expected Result:
The system displays an error message and does not show incorrect or incomplete profile information as valid data.

TC-9: View Dashboard After Login

Related Use Cases:
UC-3

Related Requirements:
FREQ10

Priority:
High

Test Type:
Functional

Primary Actor:
User

Preconditions:

* User has a valid account.
* User is authenticated.

Test Steps:

1. User logs into the application.
2. System redirects the User to the landing page.
3. System retrieves dashboard data.
4. System displays the dashboard interface.

Expected Result:
The system displays the dashboard interface on the landing page after login.

TC-10: Prevent Dashboard Access When Unauthenticated

Related Use Cases:
UC-3

Related Requirements:
FREQ10, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
User

Preconditions:

* User is not authenticated.

Test Steps:

1. User attempts to access the dashboard directly.
2. System checks authentication status.

Expected Result:
The system denies dashboard access and requires the User to authenticate before viewing the dashboard.

TC-11: Create Event with Valid Details

Related Use Cases:
UC-4

Related Requirements:
FREQ11, FREQ12, FREQ13

Priority:
High

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager has permission to manage events.

Test Steps:

1. Game Manager opens event management.
2. Game Manager selects create event.
3. Game Manager enters event name, date, start time, end time, and location.
4. Game Manager submits the event.
5. System validates the event details.
6. System saves the event.

Expected Result:
The system creates the event and stores the event name, date, start time, end time, and location.

TC-12: Administrator Creates Event with Valid Details

Related Use Cases:
UC-4

Related Requirements:
FREQ11, FREQ12, FREQ13

Priority:
High

Test Type:
Functional

Primary Actor:
Administrator

Preconditions:

* Administrator is authenticated.

Test Steps:

1. Administrator opens event management.
2. Administrator selects create event.
3. Administrator enters event name, date, start time, end time, and location.
4. Administrator submits the event.
5. System validates the event details.
6. System saves the event.

Expected Result:
The system creates and stores the event successfully.

TC-13: Delete Existing Event

Related Use Cases:
UC-4

Related Requirements:
FREQ15

Priority:
High

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager has permission to manage events.
* At least one event exists.

Test Steps:

1. Game Manager opens event management.
2. Game Manager selects an existing event.
3. Game Manager chooses to delete the event.
4. System validates the delete request.
5. System removes the event.

Expected Result:
The system deletes the selected event and the event is no longer available in event listings.

TC-14: Reject Event Creation with Missing Required Details

Related Use Cases:
UC-4

Related Requirements:
FREQ11, FREQ12, FREQ13

Priority:
High

Test Type:
Validation

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager has permission to manage events.

Test Steps:

1. Game Manager opens event management.
2. Game Manager selects create event.
3. Game Manager leaves the event name, date, time, or location blank.
4. Game Manager submits the event.
5. System validates the event information.

Expected Result:
The system rejects the event creation, displays validation errors, and does not save the event.

TC-15: Prevent Unauthorized User from Managing Events

Related Use Cases:
UC-4

Related Requirements:
FREQ11, FREQ12, FREQ13, FREQ15, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
User

Preconditions:

* User is authenticated.
* User does not have Game Manager or Administrator permissions.

Test Steps:

1. User attempts to access event management.
2. System checks the User’s role permissions.

Expected Result:
The system denies access and prevents the User from creating, modifying, or deleting events.

TC-16: Create Game Schedule with Valid Details

Related Use Cases:
UC-5

Related Requirements:
FREQ16, FREQ18, FREQ38, FREQ40

Priority:
High

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to the relevant game.

Test Steps:

1. Game Manager opens schedule management.
2. Game Manager selects create schedule.
3. Game Manager enters schedule details for the assigned game.
4. Game Manager submits the schedule.
5. System validates the schedule information.
6. System stores the schedule.
7. System updates calendar-related schedule views.

Expected Result:
The system creates the game schedule, stores it, and makes it available in the appropriate schedule/calendar views.

TC-17: Edit Existing Game Schedule

Related Use Cases:
UC-5

Related Requirements:
FREQ17, FREQ18, FREQ38

Priority:
High

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to the relevant game.
* A schedule exists for the assigned game.

Test Steps:

1. Game Manager opens schedule management.
2. Game Manager selects an existing schedule.
3. Game Manager edits schedule details.
4. Game Manager submits the update.
5. System validates the updated schedule.
6. System saves the updated schedule.

Expected Result:
The system updates the selected game schedule and displays the updated schedule information.

TC-18: Administrator Creates or Edits Game Schedule

Related Use Cases:
UC-5

Related Requirements:
FREQ16, FREQ17, FREQ18, FREQ38, FREQ40

Priority:
High

Test Type:
Functional

Primary Actor:
Administrator

Preconditions:

* Administrator is authenticated.

Test Steps:

1. Administrator opens schedule management.
2. Administrator creates or edits a game schedule.
3. Administrator submits the schedule information.
4. System validates the schedule.
5. System saves the schedule.

Expected Result:
The system successfully creates or updates the game schedule.

TC-19: Prevent Game Manager from Managing Unassigned Game Schedule

Related Use Cases:
UC-5

Related Requirements:
FREQ16, FREQ17, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to one game.
* A different game exists outside the Game Manager’s assignment.

Test Steps:

1. Game Manager attempts to create or edit a schedule for an unassigned game.
2. System checks the Game Manager’s game assignment.

Expected Result:
The system denies access and prevents schedule changes for the unassigned game.

TC-20: Detect Schedule Conflict

Related Use Cases:
UC-5

Related Requirements:
FREQ16, FREQ17

Priority:
Medium

Test Type:
Validation

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to the relevant game.
* An existing schedule already uses the submitted time slot.

Test Steps:

1. Game Manager opens schedule management.
2. Game Manager creates or edits a schedule using a conflicting time.
3. Game Manager submits the schedule.
4. System checks for schedule conflicts.

Expected Result:
The system detects the conflict, displays a scheduling conflict warning, and does not save an invalid conflicting schedule unless conflict handling allows it.

TC-21: Handle External Calendar Integration Failure

Related Use Cases:
UC-5

Related Requirements:
FREQ40

Priority:
Medium

Test Type:
Integration

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to the relevant game.
* External calendar service integration is unavailable or fails.

Test Steps:

1. Game Manager creates or edits a game schedule.
2. System validates and stores the schedule.
3. System attempts to update the external calendar service.
4. External calendar service fails to respond or rejects the request.

Expected Result:
The system reports the calendar integration failure and does not falsely indicate that the external calendar update succeeded.

TC-22: Display Calendar Interface Within Three Seconds

Related Use Cases:
UC-5, UC-12

Related Requirements:
FREQ18, FREQ19, FREQ38, NFREQ8

Priority:
High

Test Type:
Boundary

Primary Actor:
User

Preconditions:

* Event and schedule data exists.
* User is on the landing page or schedule/calendar view.

Test Steps:

1. User opens the calendar or schedule view.
2. System retrieves associated events and schedules.
3. System renders the calendar interface.

Expected Result:
The system displays the calendar interface and associated events within three seconds under expected operating conditions.

TC-23: Join Roster as Community Member

Related Use Cases:
UC-6

Related Requirements:
FREQ20

Priority:
High

Test Type:
Functional

Primary Actor:
Community Member

Preconditions:

* Community Member is authenticated.
* Community Member belongs to the relevant game community.
* The target roster is available.

Test Steps:

1. Community Member navigates to the relevant roster.
2. Community Member requests to join the roster.
3. System validates the request.
4. System updates roster membership.

Expected Result:
The Community Member is added to the roster and the updated roster membership is stored.

TC-24: Leave Roster as Community Member

Related Use Cases:
UC-6

Related Requirements:
FREQ22

Priority:
High

Test Type:
Functional

Primary Actor:
Community Member

Preconditions:

* Community Member is authenticated.
* Community Member currently belongs to a roster.

Test Steps:

1. Community Member navigates to the joined roster.
2. Community Member requests to leave the roster.
3. System validates the request.
4. System removes the Community Member from the roster.

Expected Result:
The Community Member is removed from the roster and the updated roster membership is stored.

TC-25: Prevent Unauthorized Roster Access

Related Use Cases:
UC-6

Related Requirements:
FREQ20, FREQ22, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
Community Member

Preconditions:

* Community Member is authenticated.
* Target roster is restricted based on role, game, team, or membership.

Test Steps:

1. Community Member attempts to access or modify a restricted roster.
2. System checks role and roster access permissions.

Expected Result:
The system denies access and does not modify roster membership.

TC-26: Prevent Joining Full Roster

Related Use Cases:
UC-6

Related Requirements:
FREQ20

Priority:
Medium

Test Type:
Boundary

Primary Actor:
Community Member

Preconditions:

* Community Member is authenticated.
* Community Member belongs to the relevant game community.
* The target roster has reached capacity.

Test Steps:

1. Community Member navigates to the full roster.
2. Community Member requests to join the roster.
3. System checks roster capacity.

Expected Result:
The system denies the join request and roster membership remains unchanged.

TC-27: Create Team for Assigned Game

Related Use Cases:
UC-7

Related Requirements:
FREQ26, FREQ44

Priority:
High

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to the relevant game.

Test Steps:

1. Game Manager opens the team management page for their game.
2. Game Manager selects create shell team.
3. Game Manager enters a team name.
4. Game Manager submits the team.
5. System validates the team information.
6. System stores the new team.

Expected Result:
The system creates the shell team for the Game Manager’s assigned game and displays it on the team management page.

TC-28: Modify Team for Assigned Game

Related Use Cases:
UC-7

Related Requirements:
FREQ27, FREQ44

Priority:
High

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to the relevant game.
* A team exists for the assigned game.

Test Steps:

1. Game Manager opens the team management page for their game.
2. Game Manager selects an existing team.
3. Game Manager modifies team information.
4. Game Manager submits the changes.
5. System validates the update.
6. System saves the modified team information.

Expected Result:
The system updates the team information for the Game Manager’s assigned game.

TC-29: Delete Team for Assigned Game

Related Use Cases:
UC-7

Related Requirements:
FREQ28, FREQ44

Priority:
High

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to the relevant game.
* A shell team exists for the assigned game.

Test Steps:

1. Game Manager opens the team management page for their game.
2. Game Manager selects an existing shell team.
3. Game Manager chooses to delete the team.
4. System validates the delete request.
5. System removes the shell team.

Expected Result:
The system deletes the selected shell team and removes it from the team management page.

TC-30: Prevent Game Manager from Managing Unassigned Team

Related Use Cases:
UC-7

Related Requirements:
FREQ26, FREQ27, FREQ28, FREQ44, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to one game.
* Another game and team exist outside the Game Manager’s assignment.

Test Steps:

1. Game Manager attempts to access the team management page for an unassigned game.
2. System checks the Game Manager’s assigned game permissions.

Expected Result:
The system denies access and prevents the Game Manager from creating, modifying, or deleting teams for an unassigned game.

TC-31: Reject Team Creation with Missing Team Name

Related Use Cases:
UC-7

Related Requirements:
FREQ26

Priority:
Medium

Test Type:
Validation

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to the relevant game.

Test Steps:

1. Game Manager opens the team management page.
2. Game Manager selects create shell team.
3. Game Manager leaves the team name blank.
4. Game Manager submits the team.
5. System validates the team information.

Expected Result:
The system rejects the team creation, displays a validation error, and does not create the shell team.

TC-32: Promote Community Member to Player Through Team Assignment

Related Use Cases:
UC-6, UC-7, UC-13

Related Requirements:
FREQ20, FREQ26, FREQ27, FREQ44, FREQ45, FREQ46, NFREQ4

Priority:
High

Test Type:
End-to-End

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to the relevant game.
* Community Member belongs to the relevant game community.
* A team exists for the relevant game.

Test Steps:

1. Game Manager opens the team management page for the assigned game.
2. Game Manager selects a team.
3. Game Manager moves the Community Member from the game community into the team.
4. System updates the user’s team membership.
5. System grants the user Player permissions according to the role hierarchy.
6. Player accesses team VODs and statistics.

Expected Result:
The Community Member becomes a Player for the relevant team, inherits prior role permissions, and can access Player-level team VODs and statistics for that team.

TC-33: Upload VOD for Managed Team

Related Use Cases:
UC-8, UC-13

Related Requirements:
FREQ29, FREQ45

Priority:
High

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager manages the relevant team.
* Player belongs to the relevant team.

Test Steps:

1. Game Manager opens team analytics management.
2. Game Manager uploads a VOD for the managed team.
3. System validates the uploaded VOD information.
4. System stores the VOD.
5. Player accesses team VODs.

Expected Result:
The system stores the uploaded VOD and makes it available to Players on the relevant team.

TC-34: Upload Team Data and Calculate Statistics

Related Use Cases:
UC-8, UC-13

Related Requirements:
FREQ30, FREQ43, FREQ46

Priority:
High

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager manages the relevant team.
* Player belongs to the relevant team.

Test Steps:

1. Game Manager opens team analytics management.
2. Game Manager uploads team data.
3. System validates the uploaded data.
4. System calculates team statistics based on the submitted data.
5. System stores the calculated statistics.
6. Player accesses team statistics.

Expected Result:
The system calculates and stores team statistics, and Players on the relevant team can view the statistics.

TC-35: Leave Comment on Uploaded Team Data

Related Use Cases:
UC-8, UC-13

Related Requirements:
FREQ31

Priority:
Medium

Test Type:
Functional

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager manages the relevant team.
* Uploaded team data exists.
* Player belongs to the relevant team.

Test Steps:

1. Game Manager opens uploaded team data.
2. Game Manager enters a comment for Players.
3. Game Manager submits the comment.
4. System validates and stores the comment.
5. Player accesses the team data or statistics area.

Expected Result:
The system stores the Game Manager’s comment and makes it available to Players on the relevant team.

TC-36: Reject Unsupported VOD or Team Data Upload

Related Use Cases:
UC-8

Related Requirements:
FREQ29, FREQ30

Priority:
Medium

Test Type:
Validation

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager manages the relevant team.

Test Steps:

1. Game Manager opens team analytics management.
2. Game Manager attempts to upload unsupported or invalid VOD/team data.
3. System validates the upload.

Expected Result:
The system rejects the upload, displays an upload error, and does not store invalid data.

TC-37: Prevent Game Manager from Uploading Data for Unassigned Team

Related Use Cases:
UC-8

Related Requirements:
FREQ29, FREQ30, FREQ31, FREQ43, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
Game Manager

Preconditions:

* Game Manager is authenticated.
* Game Manager is assigned to one team or game.
* Another team exists outside the Game Manager’s assignment.

Test Steps:

1. Game Manager attempts to access analytics management for an unassigned team.
2. System checks the Game Manager’s team or game assignment.
3. Game Manager attempts to upload VODs or team data.

Expected Result:
The system denies access and prevents uploads or comments for the unassigned team.

TC-38: Grant Game Manager Role

Related Use Cases:
UC-9

Related Requirements:
FREQ32, NFREQ4

Priority:
High

Test Type:
Functional

Primary Actor:
Administrator

Preconditions:

* Administrator is authenticated.
* Target user account exists.

Test Steps:

1. Administrator opens user role management.
2. Administrator selects the target user.
3. Administrator grants the Game Manager role.
4. System validates the role change.
5. System updates the user’s roles.

Expected Result:
The target user receives the Game Manager role and gains Game Manager permissions.

TC-39: Revoke Game Manager Role

Related Use Cases:
UC-9

Related Requirements:
FREQ33, NFREQ4

Priority:
High

Test Type:
Functional

Primary Actor:
Administrator

Preconditions:

* Administrator is authenticated.
* Target user account exists.
* Target user currently has the Game Manager role.

Test Steps:

1. Administrator opens user role management.
2. Administrator selects the target user.
3. Administrator revokes the Game Manager role.
4. System validates the role change.
5. System updates the user’s roles.

Expected Result:
The target user no longer has the Game Manager role and no longer has Game Manager permissions.

TC-40: Grant Administrator Role

Related Use Cases:
UC-9

Related Requirements:
FREQ34, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
Administrator

Preconditions:

* Administrator is authenticated.
* Target user account exists.

Test Steps:

1. Administrator opens user role management.
2. Administrator selects the target user.
3. Administrator grants the Administrator role.
4. System validates the role change.
5. System updates the user’s roles.

Expected Result:
The target user receives the Administrator role and gains Administrator permissions.

TC-41: Prevent Non-Administrator from Managing Roles

Related Use Cases:
UC-9

Related Requirements:
FREQ32, FREQ33, FREQ34, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
User

Preconditions:

* User is authenticated.
* User does not have Administrator permissions.

Test Steps:

1. User attempts to access user role management.
2. System checks the User’s role permissions.

Expected Result:
The system denies access and prevents the User from granting or revoking roles.

TC-42: Suspend User Account

Related Use Cases:
UC-10

Related Requirements:
FREQ36, NFREQ4

Priority:
High

Test Type:
Functional

Primary Actor:
Administrator

Preconditions:

* Administrator is authenticated.
* Target user account exists and is active.

Test Steps:

1. Administrator opens account moderation tools.
2. Administrator selects the target user.
3. Administrator suspends the account.
4. System validates the moderation request.
5. System updates the account status.

Expected Result:
The target user account is suspended and the suspension status is stored.

TC-43: Remove User Account

Related Use Cases:
UC-10

Related Requirements:
FREQ37, NFREQ4

Priority:
High

Test Type:
Functional

Primary Actor:
Administrator

Preconditions:

* Administrator is authenticated.
* Target user account exists.

Test Steps:

1. Administrator opens account moderation tools.
2. Administrator selects the target user.
3. Administrator removes the account.
4. System validates the moderation request.
5. System removes the account.

Expected Result:
The target user account is removed and can no longer be accessed as an active account.

TC-44: Prevent Non-Administrator from Moderating Accounts

Related Use Cases:
UC-10

Related Requirements:
FREQ36, FREQ37, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
User

Preconditions:

* User is authenticated.
* User does not have Administrator permissions.
* Target user account exists.

Test Steps:

1. User attempts to access account moderation tools.
2. System checks the User’s role permissions.

Expected Result:
The system denies access and prevents the User from suspending or removing accounts.

TC-45: Link Discord Account Successfully

Related Use Cases:
UC-11, UC-2

Related Requirements:
FREQ8, FREQ42

Priority:
Medium

Test Type:
Integration

Primary Actor:
User

Preconditions:

* User is authenticated.
* User has a valid Discord account.

Test Steps:

1. User opens Discord integration settings.
2. User selects the option to connect Discord.
3. System redirects the User to Discord authentication.
4. User authorizes the integration.
5. Discord API returns successful authorization.
6. System links the Discord username to the User account.
7. User views their profile page.

Expected Result:
The Discord account is linked and the User’s Discord username appears in the application and on the User profile page.

TC-46: Handle Discord Authentication Failure

Related Use Cases:
UC-11

Related Requirements:
FREQ42

Priority:
Medium

Test Type:
Integration

Primary Actor:
User

Preconditions:

* User is authenticated.
* Discord authentication fails or is rejected.

Test Steps:

1. User opens Discord integration settings.
2. User selects the option to connect Discord.
3. System redirects the User to Discord authentication.
4. Discord authentication fails or is rejected.
5. System receives the failed authentication response.

Expected Result:
The system does not link the Discord account and displays an authentication error.

TC-47: View Events and Schedules as Authenticated User

Related Use Cases:
UC-12

Related Requirements:
FREQ18, FREQ19

Priority:
High

Test Type:
Functional

Primary Actor:
User

Preconditions:

* User is authenticated.
* At least one game schedule or upcoming event exists.

Test Steps:

1. User accesses the events and schedules area.
2. System retrieves game schedules and upcoming event details.
3. System displays the information.

Expected Result:
The system displays game schedules and upcoming event details to the User.

TC-48: Display Empty Schedule Message When No Events Exist

Related Use Cases:
UC-12

Related Requirements:
FREQ18, FREQ19

Priority:
Medium

Test Type:
Negative

Primary Actor:
User

Preconditions:

* User is authenticated.
* No upcoming events or schedules exist.

Test Steps:

1. User accesses the events and schedules area.
2. System searches for upcoming events and schedules.
3. System finds no available records.

Expected Result:
The system displays an empty schedule or no-events message without causing an error.

TC-49: Restrict Calendar View to Relevant Game Roster Members

Related Use Cases:
UC-12

Related Requirements:
FREQ38, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
Player

Preconditions:

* Player is authenticated.
* Player belongs to one game roster.
* Another restricted game roster schedule exists.

Test Steps:

1. Player accesses the calendar view.
2. System checks the Player’s roster membership.
3. System retrieves schedules available to the Player.

Expected Result:
The system displays schedules for the Player’s relevant game roster and does not expose restricted roster schedules.

TC-50: View Team VODs as Player

Related Use Cases:
UC-13

Related Requirements:
FREQ45

Priority:
High

Test Type:
Functional

Primary Actor:
Player

Preconditions:

* Player is authenticated.
* Player belongs to a team.
* Game Manager has uploaded at least one VOD for the team.

Test Steps:

1. Player accesses team VODs.
2. System verifies team membership permissions.
3. System retrieves uploaded VODs for the Player’s team.
4. System displays the VODs.

Expected Result:
The system displays VODs uploaded for the Player’s team.

TC-51: View Team Statistics as Player

Related Use Cases:
UC-13

Related Requirements:
FREQ46

Priority:
High

Test Type:
Functional

Primary Actor:
Player

Preconditions:

* Player is authenticated.
* Player belongs to a team.
* Team statistics exist for the Player’s team.

Test Steps:

1. Player accesses team statistics.
2. System verifies team membership permissions.
3. System retrieves statistics for the Player’s team.
4. System displays the statistics.

Expected Result:
The system displays team statistics for the Player’s team.

TC-52: Prevent Player from Viewing Another Team’s VODs and Statistics

Related Use Cases:
UC-13

Related Requirements:
FREQ45, FREQ46, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
Player

Preconditions:

* Player is authenticated.
* Player belongs to one team.
* Another team exists with VODs and statistics.

Test Steps:

1. Player attempts to access another team’s VODs or statistics.
2. System checks the Player’s team membership.
3. System evaluates access permissions.

Expected Result:
The system denies access and does not display another team’s VODs or statistics.

TC-53: Display No VODs Available Message

Related Use Cases:
UC-13

Related Requirements:
FREQ45

Priority:
Low

Test Type:
Negative

Primary Actor:
Player

Preconditions:

* Player is authenticated.
* Player belongs to a team.
* No VODs have been uploaded for the team.

Test Steps:

1. Player accesses team VODs.
2. System verifies team membership permissions.
3. System searches for uploaded VODs.
4. System finds no VODs.

Expected Result:
The system displays a no-content or no-VODs-available message.

TC-54: Role Hierarchy Allows Player to Use Community Member and User Features

Related Use Cases:
UC-2, UC-3, UC-6, UC-12, UC-13

Related Requirements:
FREQ6, FREQ7, FREQ10, FREQ18, FREQ19, FREQ20, FREQ22, FREQ45, FREQ46, NFREQ4

Priority:
High

Test Type:
End-to-End

Primary Actor:
Player

Preconditions:

* Player is authenticated.
* Player belongs to a team.
* Player role inherits Community Member and User permissions.

Test Steps:

1. Player views their profile information.
2. Player accesses the dashboard.
3. Player accesses events and schedules.
4. Player joins or leaves an eligible roster.
5. Player accesses team VODs and statistics.

Expected Result:
The system allows the Player to perform User, Community Member, and Player-level actions according to the role hierarchy.

TC-55: Administrator Can View All Teams While Game Manager and Player Are Restricted

Related Use Cases:
UC-7, UC-13

Related Requirements:
FREQ44, FREQ45, FREQ46, NFREQ4

Priority:
High

Test Type:
Authorization

Primary Actor:
Administrator

Preconditions:

* Administrator is authenticated.
* Game Manager is authenticated and assigned to one game.
* Player is authenticated and assigned to one team.
* Multiple teams exist across different games.

Test Steps:

1. Administrator accesses team-related pages.
2. System displays all teams.
3. Game Manager accesses team management.
4. System displays only teams for the Game Manager’s assigned game.
5. Player accesses team VODs and statistics.
6. System displays only the Player’s team data.

Expected Result:
The Administrator can access all teams, while the Game Manager and Player are restricted to teams based on their role and assignment.

TC-56: Support 200 Concurrent Users

Related Use Cases:
UC-1, UC-3, UC-12

Related Requirements:
NFREQ1

Priority:
High

Test Type:
Boundary

Primary Actor:
User

Preconditions:

* Test environment supports concurrent session simulation.
* At least 200 valid User accounts or simulated users are available.

Test Steps:

1. 200 Users access the system concurrently.
2. Users perform common actions such as logging in, viewing the dashboard, and viewing events or schedules.
3. System processes all concurrent requests.

Expected Result:
The system supports at least 200 concurrent users without unacceptable failures, data corruption, or denial of normal access.

TC-57: Desktop Interface Availability

Related Use Cases:
UC-1, UC-2, UC-3, UC-4, UC-5, UC-6, UC-7, UC-8, UC-9, UC-10, UC-11, UC-12, UC-13

Related Requirements:
NFREQ5

Priority:
Medium

Test Type:
Functional

Primary Actor:
User

Preconditions:

* User has access to the application on a desktop device.
* Required role-specific accounts exist.

Test Steps:

1. User opens the application on a desktop device.
2. User accesses account, dashboard, profile, event, schedule, roster, team, Discord, and view-related interfaces allowed by role.
3. Game Manager accesses Game Manager interfaces on a desktop device.
4. Administrator accesses Administrator interfaces on a desktop device.

Expected Result:
The system provides a complete desktop interface for supported user, Game Manager, and Administrator workflows.
