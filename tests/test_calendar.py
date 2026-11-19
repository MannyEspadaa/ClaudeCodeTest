"""UC-4 events, UC-5 schedules, UC-12 viewing.

FREQ11–FREQ19, FREQ38, FREQ40, NFREQ4, NFREQ8.
Covers TC-11–TC-22, TC-47–TC-49.
"""
import datetime as dt
import time

import pytest
from django.urls import reverse

from scheduling.models import Event, ScheduleEntry, Visibility


def event_data(day, **overrides):
    data = {"name": "Spring Scrim Night", "date": day.isoformat(), "start_time": "18:00",
            "end_time": "21:00", "location": "Esports Arena", "description": "", "visibility": "public"}
    data.update(overrides)
    return data


def schedule_data(day, game, team=None, **overrides):
    data = {"game": game.pk, "team": team.pk if team else "", "kind": "match", "title": "Week 3 Match",
            "opponent": "State U", "date": day.isoformat(), "start_time": "19:00", "end_time": "20:00",
            "location": "Arena Stage A", "visibility": "community"}
    data.update(overrides)
    return data


# --- Events (UC-4) ---------------------------------------------------------------------

@pytest.mark.django_db
def test_tc11_game_manager_creates_event(client, world, login, tomorrow):
    """TC-11: event name, date, start, end and location stored."""
    login(world["gm"])
    response = client.post(reverse("event_create"), event_data(tomorrow, game=world["valorant"].pk), follow=True)
    assert b"Event Spring Scrim Night created" in response.content
    event = Event.objects.get()
    assert (event.name, event.date, event.location) == ("Spring Scrim Night", tomorrow, "Esports Arena")
    assert event.start_time == dt.time(18) and event.end_time == dt.time(21)
    assert event.game == world["valorant"] and event.created_by == world["gm"]


@pytest.mark.django_db
def test_game_manager_cannot_create_program_wide_or_other_game_event(client, world, login, tomorrow):
    login(world["gm"])
    response = client.post(reverse("event_create"), event_data(tomorrow))
    assert b"This field is required" in response.content
    response = client.post(reverse("event_create"), event_data(tomorrow, game=world["rocket"].pk))
    assert b"Select a valid choice" in response.content
    assert not Event.objects.exists()


@pytest.mark.django_db
def test_tc12_administrator_creates_event(client, world, login, tomorrow):
    """TC-12: administrators create events (including program-wide ones)."""
    login(world["admin"])
    client.post(reverse("event_create"), event_data(tomorrow, game=""))
    event = Event.objects.get()
    assert event.game is None and event.visibility == Visibility.PUBLIC


@pytest.mark.django_db
def test_edit_event(client, world, login, tomorrow):
    """FREQ14 (inferred) / UC-4: events can be edited."""
    event = Event.objects.create(name="Old", date=tomorrow, start_time=dt.time(10), end_time=dt.time(11),
                                 location="Room 1", game=world["valorant"])
    login(world["gm"])
    client.post(reverse("event_edit", args=[event.pk]),
                event_data(tomorrow, name="New name", game=world["valorant"].pk))
    event.refresh_from_db()
    assert event.name == "New name"


@pytest.mark.django_db
def test_tc13_delete_event(client, world, login, tomorrow):
    """TC-13: deleted event no longer appears in listings."""
    event = Event.objects.create(name="Doomed Event", date=tomorrow, start_time=dt.time(10),
                                 end_time=dt.time(11), location="Room 1", game=world["valorant"])
    login(world["gm"])
    client.post(reverse("event_delete", args=[event.pk]))
    assert not Event.objects.filter(pk=event.pk).exists()
    from django.test import Client
    viewer = login(world["member"], Client())
    assert b"Doomed Event" not in viewer.get(reverse("calendar")).content
    assert b"Doomed Event" not in client.get(reverse("manage_events")).content.split(b"</ul>", 1)[-1]


@pytest.mark.django_db
@pytest.mark.parametrize("blank", ["name", "date", "start_time", "end_time", "location"])
def test_tc14_reject_event_missing_details(client, world, login, tomorrow, blank):
    """TC-14: any missing required detail rejects the event."""
    login(world["gm"])
    response = client.post(reverse("event_create"), event_data(tomorrow, game=world["valorant"].pk, **{blank: ""}))
    assert b"This field is required" in response.content
    assert not Event.objects.exists()


@pytest.mark.django_db
def test_event_end_must_follow_start(client, world, login, tomorrow):
    login(world["admin"])
    response = client.post(reverse("event_create"), event_data(tomorrow, start_time="20:00", end_time="19:00"))
    assert b"End time must be after the start time" in response.content


@pytest.mark.django_db
def test_tc15_prevent_unauthorized_user_from_managing_events(client, world, login, tomorrow):
    """TC-15: users without GM/admin permissions cannot create, modify or delete events."""
    event = Event.objects.create(name="Protected", date=tomorrow, start_time=dt.time(10), end_time=dt.time(11),
                                 location="Room", game=world["valorant"])
    for who in ["member", "player", "outsider"]:
        login(world[who])
        assert client.get(reverse("manage_events")).status_code == 403
        assert client.post(reverse("event_create"), event_data(tomorrow)).status_code == 403
        assert client.post(reverse("event_edit", args=[event.pk]), event_data(tomorrow)).status_code == 403
        assert client.post(reverse("event_delete", args=[event.pk])).status_code == 403
    # a GM from another game is also refused for this event
    login(world["gm2"])
    assert client.post(reverse("event_delete", args=[event.pk])).status_code == 403
    assert Event.objects.filter(pk=event.pk, name="Protected").exists()
    assert Event.objects.count() == 1


# --- Schedules (UC-5) ------------------------------------------------------------------

@pytest.mark.django_db
def test_tc16_create_game_schedule(client, world, login, tomorrow):
    """TC-16: schedule stored, synced to the calendar service, and shown in the calendar."""
    login(world["gm"])
    response = client.post(reverse("schedule_create"),
                           schedule_data(tomorrow, world["valorant"], world["val_team"]), follow=True)
    assert b"Schedule Week 3 Match created" in response.content
    assert b"Calendar updated" in response.content
    entry = ScheduleEntry.objects.get()
    assert entry.team == world["val_team"] and entry.sync_status == ScheduleEntry.SyncStatus.SYNCED
    login(world["player"])
    assert b"Week 3 Match" in client.get(reverse("calendar")).content
    feed = client.get(reverse("calendar_feed", args=[world["player"].calendar_token])).content.decode()
    assert "SUMMARY:Week 3 Match" in feed and "BEGIN:VCALENDAR" in feed


@pytest.mark.django_db
def test_tc17_edit_game_schedule(client, world, login, tomorrow):
    """TC-17: updated schedule is saved and displayed."""
    entry = ScheduleEntry.objects.create(game=world["valorant"], team=world["val_team"], title="Practice",
                                         kind="practice", date=tomorrow, start_time=dt.time(17),
                                         end_time=dt.time(18), visibility=Visibility.TEAM)
    login(world["gm"])
    response = client.post(reverse("schedule_edit", args=[entry.pk]),
                           schedule_data(tomorrow, world["valorant"], world["val_team"],
                                         title="Moved Practice", kind="practice", start_time="15:00",
                                         end_time="16:00", visibility="team"), follow=True)
    entry.refresh_from_db()
    assert entry.title == "Moved Practice" and entry.start_time == dt.time(15)
    assert b"Moved Practice" in response.content


@pytest.mark.django_db
def test_tc18_administrator_creates_and_edits_schedule(client, world, login, tomorrow):
    """TC-18: administrators manage schedules for any game."""
    login(world["admin"])
    client.post(reverse("schedule_create"), schedule_data(tomorrow, world["rocket"], world["rl_team"]))
    entry = ScheduleEntry.objects.get()
    client.post(reverse("schedule_edit", args=[entry.pk]),
                schedule_data(tomorrow, world["rocket"], world["rl_team"], title="Finals"))
    entry.refresh_from_db()
    assert entry.title == "Finals"


@pytest.mark.django_db
def test_tc19_prevent_managing_unassigned_game_schedule(client, world, login, tomorrow):
    """TC-19: a GM cannot create or edit schedules for a game they do not manage."""
    other = ScheduleEntry.objects.create(game=world["rocket"], title="RL Match", date=tomorrow,
                                         start_time=dt.time(12), end_time=dt.time(13))
    login(world["gm"])
    response = client.post(reverse("schedule_create"), schedule_data(tomorrow, world["rocket"], world["rl_team"]))
    assert b"Select a valid choice" in response.content
    assert client.post(reverse("schedule_edit", args=[other.pk]),
                       schedule_data(tomorrow, world["rocket"], title="Hijacked")).status_code == 403
    assert client.post(reverse("schedule_delete", args=[other.pk])).status_code == 403
    other.refresh_from_db()
    assert other.title == "RL Match"
    assert ScheduleEntry.objects.count() == 1


@pytest.mark.django_db
def test_team_must_belong_to_game(client, world, login, tomorrow):
    login(world["admin"])
    response = client.post(reverse("schedule_create"), schedule_data(tomorrow, world["valorant"], world["rl_team"]))
    assert b"does not belong to the selected game" in response.content


@pytest.mark.django_db
@pytest.mark.parametrize("overrides", [
    {},                                                    # same team, same time
    {"location": "Other Room", "start_time": "19:30", "end_time": "20:30"},  # same team, overlapping
])
def test_tc20_detect_schedule_conflict_same_team(client, world, login, tomorrow, overrides):
    """TC-20: overlapping schedules for the same team are rejected with a warning."""
    ScheduleEntry.objects.create(game=world["valorant"], team=world["val_team"], title="Existing Match",
                                 date=tomorrow, start_time=dt.time(19), end_time=dt.time(20),
                                 location="Arena Stage A")
    login(world["gm"])
    response = client.post(reverse("schedule_create"),
                           schedule_data(tomorrow, world["valorant"], world["val_team"], **overrides))
    assert b"Scheduling conflict with: Existing Match" in response.content
    assert ScheduleEntry.objects.count() == 1


@pytest.mark.django_db
def test_tc20_conflict_same_location_across_games(client, world, login, tomorrow):
    ScheduleEntry.objects.create(game=world["rocket"], team=world["rl_team"], title="RL Match", date=tomorrow,
                                 start_time=dt.time(19), end_time=dt.time(20), location="arena stage a")
    login(world["gm"])
    response = client.post(reverse("schedule_create"), schedule_data(tomorrow, world["valorant"], world["val_team"]))
    assert b"Scheduling conflict" in response.content


@pytest.mark.django_db
def test_no_conflict_for_back_to_back_or_editing_self(client, world, login, tomorrow):
    entry = ScheduleEntry.objects.create(game=world["valorant"], team=world["val_team"], title="Early",
                                         date=tomorrow, start_time=dt.time(18), end_time=dt.time(19),
                                         location="Arena Stage A")
    login(world["gm"])
    client.post(reverse("schedule_create"), schedule_data(tomorrow, world["valorant"], world["val_team"]))
    assert ScheduleEntry.objects.count() == 2  # 19:00 starts exactly when 'Early' ends
    response = client.post(reverse("schedule_edit", args=[entry.pk]),
                           schedule_data(tomorrow, world["valorant"], world["val_team"], title="Early",
                                         start_time="18:00", end_time="19:00"))
    assert response.status_code == 302


@pytest.mark.django_db
def test_tc21_external_calendar_failure_is_reported(client, world, login, tomorrow, settings):
    """TC-21: schedule saved, failure reported, never shown as a successful sync."""
    settings.CALENDAR_PROVIDER = "integrations.calendar.UnavailableCalendarProvider"
    login(world["gm"])
    response = client.post(reverse("schedule_create"),
                           schedule_data(tomorrow, world["valorant"], world["val_team"]), follow=True)
    content = response.content.decode()
    assert "Calendar update failed" in content
    assert "Calendar updated" not in content
    entry = ScheduleEntry.objects.get()
    assert entry.sync_status == ScheduleEntry.SyncStatus.FAILED
    # retry once the service is back
    settings.CALENDAR_PROVIDER = "integrations.calendar.LocalCalendarProvider"
    client.post(reverse("schedule_resync", args=[entry.pk]))
    entry.refresh_from_db()
    assert entry.sync_status == ScheduleEntry.SyncStatus.SYNCED


@pytest.mark.django_db
def test_tc22_calendar_renders_within_three_seconds(client, world, login, make_user):
    """TC-22 / NFREQ8: calendar with a realistic data volume renders in under 3 s."""
    today = dt.date.today()
    Event.objects.bulk_create(
        Event(name=f"Event {i}", date=today + dt.timedelta(days=i % 30), start_time=dt.time(9 + i % 8),
              end_time=dt.time(10 + i % 8), location="Hall", visibility=Visibility.PUBLIC)
        for i in range(300)
    )
    ScheduleEntry.objects.bulk_create(
        ScheduleEntry(game=world["valorant"], team=world["val_team"], title=f"Match {i}",
                      date=today + dt.timedelta(days=i % 30), start_time=dt.time(8), end_time=dt.time(9),
                      visibility=Visibility.TEAM)
        for i in range(300)
    )
    login(world["player"])
    started = time.perf_counter()
    response = client.get(reverse("calendar"))
    elapsed = time.perf_counter() - started
    assert response.status_code == 200
    assert b"Event 0" in response.content and b"Match 0" in response.content
    assert elapsed < 3.0, f"calendar took {elapsed:.2f}s"


# --- Viewing (UC-12) ---------------------------------------------------------------------

@pytest.mark.django_db
def test_tc47_view_events_and_schedules(client, world, login, tomorrow):
    """TC-47: signed-in users see game schedules and upcoming events."""
    Event.objects.create(name="Open House", date=tomorrow, start_time=dt.time(12), end_time=dt.time(13),
                         location="Lobby", visibility=Visibility.PUBLIC)
    ScheduleEntry.objects.create(game=world["valorant"], title="Community Match", date=tomorrow,
                                 start_time=dt.time(19), end_time=dt.time(20), visibility=Visibility.COMMUNITY)
    login(world["member"])
    content = client.get(reverse("calendar")).content.decode()
    assert "Open House" in content and "Community Match" in content and "Lobby" in content
    dashboard = client.get(reverse("dashboard")).content.decode()
    assert "Open House" in dashboard and "Community Match" in dashboard


@pytest.mark.django_db
def test_tc48_empty_schedule_message(client, world, login):
    """TC-48: no events → friendly empty message, no error."""
    login(world["member"])
    response = client.get(reverse("calendar"))
    assert response.status_code == 200
    assert b"No upcoming events or schedules in this period" in response.content


@pytest.mark.django_db
def test_calendar_requires_sign_in(client):
    assert client.get(reverse("calendar")).status_code == 302


@pytest.mark.django_db
def test_tc49_calendar_restricted_to_relevant_roster(client, world, login, tomorrow):
    """TC-49: players see their roster's schedules but not restricted schedules of other rosters/teams."""
    mk = lambda **kw: ScheduleEntry.objects.create(date=tomorrow, start_time=dt.time(10), end_time=dt.time(11), **kw)
    mk(game=world["valorant"], team=world["val_team"], title="Valorant Team Practice", visibility=Visibility.TEAM)
    mk(game=world["valorant"], title="Valorant Community Match", visibility=Visibility.COMMUNITY)
    mk(game=world["rocket"], team=world["rl_team"], title="RL Team Practice", visibility=Visibility.TEAM)
    mk(game=world["rocket"], title="RL Community Match", visibility=Visibility.COMMUNITY)
    Event.objects.create(name="RL Team Meeting", date=tomorrow, start_time=dt.time(14), end_time=dt.time(15),
                         location="Room", game=world["rocket"], team=world["rl_team"], visibility=Visibility.TEAM)

    def seen(user):
        login(user)
        return client.get(reverse("calendar")).content.decode()

    player = seen(world["player"])
    assert "Valorant Team Practice" in player and "Valorant Community Match" in player
    assert "RL Team Practice" not in player and "RL Community Match" not in player
    assert "RL Team Meeting" not in player
    feed = client.get(reverse("calendar_feed", args=[world["player"].calendar_token])).content.decode()
    assert "RL Team Practice" not in feed

    member = seen(world["member"])  # Valorant community member, not on a team
    assert "Valorant Community Match" in member and "Valorant Team Practice" not in member

    gm = seen(world["gm"])  # GM sees everything in their game, nothing restricted elsewhere
    assert "Valorant Team Practice" in gm and "RL Team Practice" not in gm

    admin = seen(world["admin"])
    assert all(t in admin for t in ["Valorant Team Practice", "RL Team Practice", "RL Team Meeting"])


@pytest.mark.django_db
def test_calendar_feed_unknown_token_404(client):
    assert client.get(reverse("calendar_feed", args=["nope"])).status_code == 404
