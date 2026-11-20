# Test Cases with Requirement Coverage

Generated from `docs/source/testCases.md` and an actual `pytest` run: **122 test runs, 122 passed, 0 failed**. Each test case lists its requirements, the automated tests that implement it (parametrized cases counted individually) and the result.

Requirement texts were not supplied; their meaning is inferred (see `docs/DECISIONS.md`).

## Summary

| Measure | Result |
|---|---|
| Test cases specified | 57 |
| Test cases with automated tests | 57 / 57 |
| Test cases passing | 57 / 57 |
| Requirements referenced by test cases | 40 |
| Requirements with at least one passing test case | 40 / 40 |
| Requirement IDs in FREQ1–46 / NFREQ1–8 never referenced by any test case | FREQ2, FREQ3, FREQ5, FREQ14, FREQ21, FREQ23, FREQ24, FREQ25, FREQ35, FREQ39, FREQ41, NFREQ2, NFREQ3, NFREQ6 |

## Requirement coverage

| Requirement | Test cases | Automated test runs | Status |
|---|---|---|---|
| FREQ1 | TC-1, TC-2, TC-3, TC-4, TC-5 | 11 | ✅ Covered, passing |
| FREQ4 | TC-1, TC-2, TC-4, TC-5 | 6 | ✅ Covered, passing |
| FREQ6 | TC-6, TC-8, TC-54 | 3 | ✅ Covered, passing |
| FREQ7 | TC-6, TC-8, TC-54 | 3 | ✅ Covered, passing |
| FREQ8 | TC-6, TC-8, TC-45 | 3 | ✅ Covered, passing |
| FREQ9 | TC-7, TC-8 | 2 | ✅ Covered, passing |
| FREQ10 | TC-9, TC-10, TC-54 | 3 | ✅ Covered, passing |
| FREQ11 | TC-11, TC-12, TC-14, TC-15 | 8 | ✅ Covered, passing |
| FREQ12 | TC-11, TC-12, TC-14, TC-15 | 8 | ✅ Covered, passing |
| FREQ13 | TC-11, TC-12, TC-14, TC-15 | 8 | ✅ Covered, passing |
| FREQ15 | TC-13, TC-15 | 2 | ✅ Covered, passing |
| FREQ16 | TC-16, TC-18, TC-19, TC-20 | 6 | ✅ Covered, passing |
| FREQ17 | TC-17, TC-18, TC-19, TC-20 | 6 | ✅ Covered, passing |
| FREQ18 | TC-16, TC-17, TC-18, TC-22, TC-47, TC-48, TC-54 | 7 | ✅ Covered, passing |
| FREQ19 | TC-22, TC-47, TC-48, TC-54 | 4 | ✅ Covered, passing |
| FREQ20 | TC-23, TC-25, TC-26, TC-32, TC-54 | 5 | ✅ Covered, passing |
| FREQ22 | TC-24, TC-25, TC-54 | 3 | ✅ Covered, passing |
| FREQ26 | TC-27, TC-30, TC-31, TC-32 | 5 | ✅ Covered, passing |
| FREQ27 | TC-28, TC-30, TC-32 | 3 | ✅ Covered, passing |
| FREQ28 | TC-29, TC-30 | 2 | ✅ Covered, passing |
| FREQ29 | TC-33, TC-36, TC-37 | 14 | ✅ Covered, passing |
| FREQ30 | TC-34, TC-36, TC-37 | 14 | ✅ Covered, passing |
| FREQ31 | TC-35, TC-37 | 2 | ✅ Covered, passing |
| FREQ32 | TC-38, TC-41 | 2 | ✅ Covered, passing |
| FREQ33 | TC-39, TC-41 | 2 | ✅ Covered, passing |
| FREQ34 | TC-40, TC-41 | 2 | ✅ Covered, passing |
| FREQ36 | TC-42, TC-44 | 2 | ✅ Covered, passing |
| FREQ37 | TC-43, TC-44 | 2 | ✅ Covered, passing |
| FREQ38 | TC-16, TC-17, TC-18, TC-22, TC-49 | 5 | ✅ Covered, passing |
| FREQ40 | TC-16, TC-18, TC-21 | 3 | ✅ Covered, passing |
| FREQ42 | TC-45, TC-46 | 3 | ✅ Covered, passing |
| FREQ43 | TC-34, TC-37 | 2 | ✅ Covered, passing |
| FREQ44 | TC-27, TC-28, TC-29, TC-30, TC-32, TC-55 | 6 | ✅ Covered, passing |
| FREQ45 | TC-32, TC-33, TC-50, TC-52, TC-53, TC-54, TC-55 | 7 | ✅ Covered, passing |
| FREQ46 | TC-32, TC-34, TC-51, TC-52, TC-54, TC-55 | 6 | ✅ Covered, passing |
| NFREQ1 | TC-56 | 1 | ✅ Covered, passing |
| NFREQ4 | TC-10, TC-15, TC-19, TC-25, TC-30, TC-32, TC-37, TC-38, TC-39, TC-40, TC-41, TC-42, TC-43, TC-44, TC-49, TC-52, TC-54, TC-55 | 18 | ✅ Covered, passing |
| NFREQ5 | TC-57 | 1 | ✅ Covered, passing |
| NFREQ7 | TC-1, TC-5 | 2 | ✅ Covered, passing |
| NFREQ8 | TC-22 | 1 | ✅ Covered, passing |

**Not referenced by any test case** (no specification available, so no dedicated test case exists): FREQ2, FREQ3, FREQ5, FREQ14, FREQ21, FREQ23, FREQ24, FREQ25, FREQ35, FREQ39, FREQ41, NFREQ2, NFREQ3, NFREQ6. FREQ14 is treated as *edit event* and is covered by `test_calendar.py::test_edit_event`.

## Test cases

| TC | Title | Use cases | Requirements | Priority | Type | Automated tests | Runs | Result |
|---|---|---|---|---|---|---|---|---|
| TC-1 | Create Account with Valid Official Email | UC-1 | FREQ1, FREQ4, NFREQ7 | High | Functional | `test_auth.py::test_tc01_create_account_with_valid_official_email` | 1 | ✅ Pass |
| TC-2 | Reject Account Creation with Non-Official Email | UC-1 | FREQ1, FREQ4 | High | Validation | `test_auth.py::test_tc02_reject_non_official_email` | 3 | ✅ Pass |
| TC-3 | Reject Account Creation with Missing Required Fields | UC-1 | FREQ1 | High | Validation | `test_auth.py::test_tc03_reject_missing_required_fields` | 5 | ✅ Pass |
| TC-4 | Reject Duplicate Email Registration | UC-1 | FREQ1, FREQ4 | Medium | Negative | `test_auth.py::test_tc04_reject_duplicate_email` | 1 | ✅ Pass |
| TC-5 | Complete Onboarding Within Required Time | UC-1 | FREQ1, FREQ4, NFREQ7 | Medium | Boundary | `test_auth.py::test_tc05_onboarding_completes_within_required_time` | 1 | ✅ Pass |
| TC-6 | View Own Profile Information | UC-2 | FREQ6, FREQ7, FREQ8 | High | Functional | `test_profiles_admin.py::test_tc06_view_own_profile` | 1 | ✅ Pass |
| TC-7 | View Another User Profile | UC-2 | FREQ9 | Medium | Functional | `test_profiles_admin.py::test_tc07_view_another_user_profile` | 1 | ✅ Pass |
| TC-8 | Handle Profile Retrieval Failure | UC-2 | FREQ6, FREQ7, FREQ8, FREQ9 | Medium | Negative | `test_profiles_admin.py::test_tc08_profile_retrieval_failure` | 1 | ✅ Pass |
| TC-9 | View Dashboard After Login | UC-3 | FREQ10 | High | Functional | `test_auth.py::test_tc09_view_dashboard_after_login` | 1 | ✅ Pass |
| TC-10 | Prevent Dashboard Access When Unauthenticated | UC-3 | FREQ10, NFREQ4 | High | Authorization | `test_auth.py::test_tc10_prevent_dashboard_access_when_unauthenticated` | 1 | ✅ Pass |
| TC-11 | Create Event with Valid Details | UC-4 | FREQ11, FREQ12, FREQ13 | High | Functional | `test_calendar.py::test_tc11_game_manager_creates_event` | 1 | ✅ Pass |
| TC-12 | Administrator Creates Event with Valid Details | UC-4 | FREQ11, FREQ12, FREQ13 | High | Functional | `test_calendar.py::test_tc12_administrator_creates_event` | 1 | ✅ Pass |
| TC-13 | Delete Existing Event | UC-4 | FREQ15 | High | Functional | `test_calendar.py::test_tc13_delete_event` | 1 | ✅ Pass |
| TC-14 | Reject Event Creation with Missing Required Details | UC-4 | FREQ11, FREQ12, FREQ13 | High | Validation | `test_calendar.py::test_tc14_reject_event_missing_details` | 5 | ✅ Pass |
| TC-15 | Prevent Unauthorized User from Managing Events | UC-4 | FREQ11, FREQ12, FREQ13, FREQ15, NFREQ4 | High | Authorization | `test_calendar.py::test_tc15_prevent_unauthorized_user_from_managing_events` | 1 | ✅ Pass |
| TC-16 | Create Game Schedule with Valid Details | UC-5 | FREQ16, FREQ18, FREQ38, FREQ40 | High | Functional | `test_calendar.py::test_tc16_create_game_schedule` | 1 | ✅ Pass |
| TC-17 | Edit Existing Game Schedule | UC-5 | FREQ17, FREQ18, FREQ38 | High | Functional | `test_calendar.py::test_tc17_edit_game_schedule` | 1 | ✅ Pass |
| TC-18 | Administrator Creates or Edits Game Schedule | UC-5 | FREQ16, FREQ17, FREQ18, FREQ38, FREQ40 | High | Functional | `test_calendar.py::test_tc18_administrator_creates_and_edits_schedule` | 1 | ✅ Pass |
| TC-19 | Prevent Game Manager from Managing Unassigned Game Schedule | UC-5 | FREQ16, FREQ17, NFREQ4 | High | Authorization | `test_calendar.py::test_tc19_prevent_managing_unassigned_game_schedule` | 1 | ✅ Pass |
| TC-20 | Detect Schedule Conflict | UC-5 | FREQ16, FREQ17 | Medium | Validation | `test_calendar.py::test_tc20_conflict_same_location_across_games`<br>`test_calendar.py::test_tc20_detect_schedule_conflict_same_team` | 3 | ✅ Pass |
| TC-21 | Handle External Calendar Integration Failure | UC-5 | FREQ40 | Medium | Integration | `test_calendar.py::test_tc21_external_calendar_failure_is_reported` | 1 | ✅ Pass |
| TC-22 | Display Calendar Interface Within Three Seconds | UC-5, UC-12 | FREQ18, FREQ19, FREQ38, NFREQ8 | High | Boundary | `test_calendar.py::test_tc22_calendar_renders_within_three_seconds` | 1 | ✅ Pass |
| TC-23 | Join Roster as Community Member | UC-6 | FREQ20 | High | Functional | `test_teams.py::test_tc23_join_roster` | 1 | ✅ Pass |
| TC-24 | Leave Roster as Community Member | UC-6 | FREQ22 | High | Functional | `test_teams.py::test_tc24_leave_roster` | 1 | ✅ Pass |
| TC-25 | Prevent Unauthorized Roster Access | UC-6 | FREQ20, FREQ22, NFREQ4 | High | Authorization | `test_teams.py::test_tc25_prevent_unauthorized_roster_access` | 1 | ✅ Pass |
| TC-26 | Prevent Joining Full Roster | UC-6 | FREQ20 | Medium | Boundary | `test_teams.py::test_tc26_prevent_joining_full_roster` | 1 | ✅ Pass |
| TC-27 | Create Team for Assigned Game | UC-7 | FREQ26, FREQ44 | High | Functional | `test_teams.py::test_tc27_create_team_for_assigned_game` | 1 | ✅ Pass |
| TC-28 | Modify Team for Assigned Game | UC-7 | FREQ27, FREQ44 | High | Functional | `test_teams.py::test_tc28_modify_team_for_assigned_game` | 1 | ✅ Pass |
| TC-29 | Delete Team for Assigned Game | UC-7 | FREQ28, FREQ44 | High | Functional | `test_teams.py::test_tc29_delete_shell_team` | 1 | ✅ Pass |
| TC-30 | Prevent Game Manager from Managing Unassigned Team | UC-7 | FREQ26, FREQ27, FREQ28, FREQ44, NFREQ4 | High | Authorization | `test_teams.py::test_tc30_prevent_managing_unassigned_team` | 1 | ✅ Pass |
| TC-31 | Reject Team Creation with Missing Team Name | UC-7 | FREQ26 | Medium | Validation | `test_teams.py::test_tc31_reject_team_without_name` | 2 | ✅ Pass |
| TC-32 | Promote Community Member to Player Through Team Assignment | UC-6, UC-7, UC-13 | FREQ20, FREQ26, FREQ27, FREQ44, FREQ45, FREQ46, NFREQ4 | High | End-to-End | `test_teams.py::test_tc32_promote_community_member_to_player` | 1 | ✅ Pass |
| TC-33 | Upload VOD for Managed Team | UC-8, UC-13 | FREQ29, FREQ45 | High | Functional | `test_analytics.py::test_tc33_upload_vod_for_managed_team` | 1 | ✅ Pass |
| TC-34 | Upload Team Data and Calculate Statistics | UC-8, UC-13 | FREQ30, FREQ43, FREQ46 | High | Functional | `test_analytics.py::test_tc34_upload_team_data_and_calculate_statistics` | 1 | ✅ Pass |
| TC-35 | Leave Comment on Uploaded Team Data | UC-8, UC-13 | FREQ31 | Medium | Functional | `test_analytics.py::test_tc35_comment_on_uploaded_team_data` | 1 | ✅ Pass |
| TC-36 | Reject Unsupported VOD or Team Data Upload | UC-8 | FREQ29, FREQ30 | Medium | Validation | `test_analytics.py::test_tc36_partial_bad_rows_store_nothing`<br>`test_analytics.py::test_tc36_reject_binary_and_oversize`<br>`test_analytics.py::test_tc36_reject_invalid_team_data`<br>`test_analytics.py::test_tc36_reject_unsupported_vod` | 12 | ✅ Pass |
| TC-37 | Prevent Game Manager from Uploading Data for Unassigned Team | UC-8 | FREQ29, FREQ30, FREQ31, FREQ43, NFREQ4 | High | Authorization | `test_analytics.py::test_tc37_prevent_uploads_for_unassigned_team` | 1 | ✅ Pass |
| TC-38 | Grant Game Manager Role | UC-9 | FREQ32, NFREQ4 | High | Functional | `test_profiles_admin.py::test_tc38_grant_game_manager_role` | 1 | ✅ Pass |
| TC-39 | Revoke Game Manager Role | UC-9 | FREQ33, NFREQ4 | High | Functional | `test_profiles_admin.py::test_tc39_revoke_game_manager_role` | 1 | ✅ Pass |
| TC-40 | Grant Administrator Role | UC-9 | FREQ34, NFREQ4 | High | Authorization | `test_profiles_admin.py::test_tc40_grant_administrator_role` | 1 | ✅ Pass |
| TC-41 | Prevent Non-Administrator from Managing Roles | UC-9 | FREQ32, FREQ33, FREQ34, NFREQ4 | High | Authorization | `test_profiles_admin.py::test_tc41_prevent_non_administrator_from_managing_roles` | 1 | ✅ Pass |
| TC-42 | Suspend User Account | UC-10 | FREQ36, NFREQ4 | High | Functional | `test_profiles_admin.py::test_tc42_suspend_user_account` | 1 | ✅ Pass |
| TC-43 | Remove User Account | UC-10 | FREQ37, NFREQ4 | High | Functional | `test_profiles_admin.py::test_tc43_remove_user_account` | 1 | ✅ Pass |
| TC-44 | Prevent Non-Administrator from Moderating Accounts | UC-10 | FREQ36, FREQ37, NFREQ4 | High | Authorization | `test_profiles_admin.py::test_tc44_prevent_non_administrator_from_moderating` | 1 | ✅ Pass |
| TC-45 | Link Discord Account Successfully | UC-11, UC-2 | FREQ8, FREQ42 | Medium | Integration | `test_profiles_admin.py::test_tc45_link_discord_account` | 1 | ✅ Pass |
| TC-46 | Handle Discord Authentication Failure | UC-11 | FREQ42 | Medium | Integration | `test_profiles_admin.py::test_tc46_discord_api_rejects_code`<br>`test_profiles_admin.py::test_tc46_handle_discord_authentication_failure` | 2 | ✅ Pass |
| TC-47 | View Events and Schedules as Authenticated User | UC-12 | FREQ18, FREQ19 | High | Functional | `test_calendar.py::test_tc47_view_events_and_schedules` | 1 | ✅ Pass |
| TC-48 | Display Empty Schedule Message When No Events Exist | UC-12 | FREQ18, FREQ19 | Medium | Negative | `test_calendar.py::test_tc48_empty_schedule_message` | 1 | ✅ Pass |
| TC-49 | Restrict Calendar View to Relevant Game Roster Members | UC-12 | FREQ38, NFREQ4 | High | Authorization | `test_calendar.py::test_tc49_calendar_restricted_to_relevant_roster` | 1 | ✅ Pass |
| TC-50 | View Team VODs as Player | UC-13 | FREQ45 | High | Functional | `test_analytics.py::test_tc50_view_team_vods_as_player` | 1 | ✅ Pass |
| TC-51 | View Team Statistics as Player | UC-13 | FREQ46 | High | Functional | `test_analytics.py::test_tc51_view_team_statistics_as_player` | 1 | ✅ Pass |
| TC-52 | Prevent Player from Viewing Another Team’s VODs and Statistics | UC-13 | FREQ45, FREQ46, NFREQ4 | High | Authorization | `test_analytics.py::test_tc52_prevent_player_viewing_other_team_data` | 1 | ✅ Pass |
| TC-53 | Display No VODs Available Message | UC-13 | FREQ45 | Low | Negative | `test_analytics.py::test_tc53_no_vods_message` | 1 | ✅ Pass |
| TC-54 | Role Hierarchy Allows Player to Use Community Member and User Features | UC-2, UC-3, UC-6, UC-12, UC-13 | FREQ6, FREQ7, FREQ10, FREQ18, FREQ19, FREQ20, FREQ22, FREQ45, FREQ46, NFREQ4 | High | End-to-End | `test_completion.py::test_tc54_player_inherits_user_and_community_member_features` | 1 | ✅ Pass |
| TC-55 | Administrator Can View All Teams While Game Manager and Player Are Restricted | UC-7, UC-13 | FREQ44, FREQ45, FREQ46, NFREQ4 | High | Authorization | `test_completion.py::test_tc55_admin_sees_all_teams_gm_and_player_restricted` | 1 | ✅ Pass |
| TC-56 | Support 200 Concurrent Users | UC-1, UC-3, UC-12 | NFREQ1 | High | Boundary | `test_completion.py::test_tc56_supports_200_concurrent_users` | 1 | ✅ Pass |
| TC-57 | Desktop Interface Availability | UC-1, UC-2, UC-3, UC-4, UC-5, UC-6, UC-7, UC-8, UC-9, UC-10, UC-11, UC-12, UC-13 | NFREQ5 | Medium | Functional | `test_completion.py::test_tc57_desktop_interface_available_for_all_roles` | 1 | ✅ Pass |

## Additional tests (beyond the specified test cases)

These cover gaps identified during analysis (login rules, edits, edge cases, traceability).

| Test | Runs | Result |
|---|---|---|
| `test_analytics.py::test_comment_on_vod_visible_on_vod_page` | 1 | ✅ Pass |
| `test_analytics.py::test_players_cannot_post_or_delete_comments` | 1 | ✅ Pass |
| `test_analytics.py::test_removing_upload_recalculates` | 1 | ✅ Pass |
| `test_auth.py::test_dashboard_load_failure_shows_error` | 1 | ✅ Pass |
| `test_auth.py::test_duplicate_username_rejected` | 1 | ✅ Pass |
| `test_auth.py::test_logout` | 1 | ✅ Pass |
| `test_auth.py::test_official_email_allows_subdomains` | 1 | ✅ Pass |
| `test_auth.py::test_resend_verification_sends_new_link` | 1 | ✅ Pass |
| `test_auth.py::test_sign_in_with_username_or_email` | 3 | ✅ Pass |
| `test_auth.py::test_unverified_user_cannot_sign_in` | 1 | ✅ Pass |
| `test_auth.py::test_verification_link_expired_or_tampered` | 1 | ✅ Pass |
| `test_auth.py::test_wrong_password_rejected` | 1 | ✅ Pass |
| `test_calendar.py::test_calendar_feed_unknown_token_404` | 1 | ✅ Pass |
| `test_calendar.py::test_calendar_requires_sign_in` | 1 | ✅ Pass |
| `test_calendar.py::test_edit_event` | 1 | ✅ Pass |
| `test_calendar.py::test_event_end_must_follow_start` | 1 | ✅ Pass |
| `test_calendar.py::test_game_manager_cannot_create_program_wide_or_other_game_event` | 1 | ✅ Pass |
| `test_calendar.py::test_no_conflict_for_back_to_back_or_editing_self` | 1 | ✅ Pass |
| `test_calendar.py::test_team_must_belong_to_game` | 1 | ✅ Pass |
| `test_completion.py::test_every_test_case_is_automated` | 1 | ✅ Pass |
| `test_completion.py::test_public_pages_render` | 1 | ✅ Pass |
| `test_completion.py::test_stylesheet_defines_desktop_layout` | 1 | ✅ Pass |
| `test_completion.py::test_user_holding_multiple_roles` | 1 | ✅ Pass |
| `test_profiles_admin.py::test_admin_cannot_moderate_self` | 1 | ✅ Pass |
| `test_profiles_admin.py::test_admin_manages_game_communities` | 1 | ✅ Pass |
| `test_profiles_admin.py::test_discord_callback_rejects_forged_state` | 1 | ✅ Pass |
| `test_profiles_admin.py::test_edit_own_account` | 1 | ✅ Pass |
| `test_profiles_admin.py::test_invalid_role_configurations_rejected` | 1 | ✅ Pass |
| `test_profiles_admin.py::test_profile_shows_team_to_teammates_and_managers` | 1 | ✅ Pass |
| `test_profiles_admin.py::test_unlink_discord` | 1 | ✅ Pass |
| `test_teams.py::test_duplicate_team_name_rejected` | 1 | ✅ Pass |
| `test_teams.py::test_game_list_and_detail_render` | 1 | ✅ Pass |
| `test_teams.py::test_game_manager_can_deny_request` | 1 | ✅ Pass |
| `test_teams.py::test_join_requires_approval_when_configured` | 1 | ✅ Pass |
| `test_teams.py::test_player_must_be_removed_from_team_before_leaving_roster` | 1 | ✅ Pass |
| `test_teams.py::test_promotion_requires_community_membership_and_one_team_per_game` | 1 | ✅ Pass |
| `test_teams.py::test_removing_player_returns_them_to_community_member` | 1 | ✅ Pass |
| `test_teams.py::test_team_list_visibility` | 1 | ✅ Pass |
