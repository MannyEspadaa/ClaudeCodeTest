Use Cases

1. Manage Account
   Actor: User

2. Join Game Community
   Actor: User

3. View Community Content
   Actor: Community Member

4. Manage Team Roster
   Actor: Game Manager

5. Promote Community Member to Player
   Actor: Game Manager

6. Manage Team Schedule
   Actor: Game Manager

7. Upload and Manage VODs
   Actor: Game Manager

8. View Team VODs
   Actor: Player

9. View Team Statistics
   Actor: Player

10. Manage Statistics
    Actor: Game Manager

11. Manage Game Communities
    Actor: Administrator

12. Manage Users and Roles
    Actor: Administrator

13. Manage Announcements and Events
    Actor: Administrator

14. View Team Information
    Actor: Player

15. View Assigned Team Rosters
    Actor: Game Manager

16. Manage Discord and Calendar Integrations
    Actor: Administrator


Grouped UseCases:

| Use Case                         | Related Requirements                           | Actor                       |
| -------------------------------- | ---------------------------------------------- | --------------------------- |
| Create Account                   | FREQ1, FREQ4, NFREQ7                           | User                        |
| View Profile Information         | FREQ6, FREQ7, FREQ8, FREQ9                     | User                        |
| View Dashboard                   | FREQ10                                         | User                        |
| Create and Manage Events         | FREQ11, FREQ12, FREQ13, FREQ15                 | Game Manager, Administrator |
| Create and Manage Game Schedules | FREQ16, FREQ17, FREQ18, FREQ38, FREQ40, NFREQ8 | Game Manager, Administrator |
| Join or Leave Rosters            | FREQ20, FREQ22                                 | Community Member            |
| Create and Manage Teams          | FREQ26, FREQ27, FREQ28, FREQ44                 | Game Manager                |
| Upload and Analyze Team Data     | FREQ29, FREQ30, FREQ31, FREQ43                 | Game Manager                |
| Manage User Roles                | FREQ32, FREQ33, FREQ34, NFREQ4                 | Administrator               |
| Moderate User Accounts           | FREQ36, FREQ37, NFREQ4                         | Administrator               |
| Integrate Discord Accounts       | FREQ42                                         | User                        |
| View Events and Schedules        | FREQ18, FREQ19, FREQ38                         | User                        |
| View Team VODs and Statistics    | FREQ45, FREQ46                                 | Player                      |
