"""Cross-cutting and non-functional requirements.

Role hierarchy (TC-54), cross-role team visibility (TC-55), 200 concurrent
users (TC-56, NFREQ1), desktop interfaces (TC-57, NFREQ5), dashboard/landing
rendering (FREQ10, NFREQ8) and test-case traceability.
"""
import datetime as dt
import http.cookiejar
import re
import threading
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.handlers.wsgi import WSGIHandler
from django.core.servers.basehttp import ThreadedWSGIServer, WSGIRequestHandler
from django.urls import reverse

from analytics.models import VOD, TeamStatistics
from scheduling.models import Event, ScheduleEntry, Visibility
from teams.models import CommunityMembership, Game, Team

from .conftest import PASSWORD

User = get_user_model()


@pytest.mark.django_db
def test_tc54_player_inherits_user_and_community_member_features(client, world, login, tomorrow):
    """TC-54: a Player can do User, Community Member and Player actions."""
    player, team = world["player"], world["val_team"]
    Event.objects.create(name="Program Social", date=tomorrow, start_time=dt.time(18), end_time=dt.time(19),
                         location="Union", visibility=Visibility.PUBLIC)
    VOD.objects.create(team=team, title="Team VOD", url="https://youtu.be/v")
    TeamStatistics.objects.create(team=team, matches_played=1, wins=1, win_rate=100)
    login(player)
    assert b"player@school.edu" in client.get(reverse("my_profile")).content          # User
    assert client.get(reverse("dashboard")).status_code == 200                         # User
    assert b"Program Social" in client.get(reverse("calendar")).content                # User
    client.post(reverse("join_game", args=[world["rocket"].slug]))                     # Community Member
    assert CommunityMembership.objects.filter(user=player, game=world["rocket"]).exists()
    client.post(reverse("leave_game", args=[world["rocket"].slug]))
    assert not CommunityMembership.objects.filter(user=player, game=world["rocket"]).exists()
    assert b"Team VOD" in client.get(reverse("team_vods", args=[team.pk])).content     # Player
    assert b"100" in client.get(reverse("team_stats", args=[team.pk])).content         # Player


@pytest.mark.django_db
def test_tc55_admin_sees_all_teams_gm_and_player_restricted(client, world, login):
    """TC-55: admin sees every team; GM only their game's teams; player only their team."""
    extra = Team.objects.create(game=world["valorant"], name="Valorant JV")
    all_names = {"Valorant Varsity", "Valorant JV", "RL Varsity"}

    def listed(user):
        login(user)
        content = client.get(reverse("team_list")).content.decode()
        return {name for name in all_names if name in content}

    assert listed(world["admin"]) == all_names
    assert listed(world["gm"]) == {"Valorant Varsity", "Valorant JV"}
    assert listed(world["player"]) == {"Valorant Varsity"}

    login(world["gm"])
    assert client.get(reverse("team_detail", args=[extra.pk])).status_code == 200
    assert client.get(reverse("team_detail", args=[world["rl_team"].pk])).status_code == 403
    login(world["player"])
    assert client.get(reverse("team_stats", args=[world["val_team"].pk])).status_code == 200
    assert client.get(reverse("team_stats", args=[extra.pk])).status_code == 403
    login(world["admin"])
    for team in Team.objects.all():
        assert client.get(reverse("team_detail", args=[team.pk])).status_code == 200
        assert client.get(reverse("manage_analytics", args=[team.pk])).status_code == 200


@pytest.mark.django_db
def test_user_holding_multiple_roles(client, world, login):
    """userContext Q1: a Player in one game can be Game Manager of another; scopes stay separate."""
    from teams.models import GameManagerAssignment
    from core import permissions as perms

    player = world["player"]
    GameManagerAssignment.objects.create(user=player, game=world["rocket"])
    assert {"Player", "Game Manager"} <= set(perms.role_labels(player))
    login(player)
    assert client.get(reverse("manage_teams", args=[world["rocket"].slug])).status_code == 200
    assert client.get(reverse("manage_teams", args=[world["valorant"].slug])).status_code == 403
    assert client.get(reverse("team_vods", args=[world["val_team"].pk])).status_code == 200


# --- TC-56 / NFREQ1: 200 concurrent users --------------------------------------------------

class _BigBacklogServer(ThreadedWSGIServer):
    request_queue_size = 512
    daemon_threads = True


class _QuietHandler(WSGIRequestHandler):
    def log_message(self, *args):
        pass


@pytest.mark.django_db(transaction=True)
def test_tc56_supports_200_concurrent_users():
    """TC-56: 200 users sign in, open the dashboard and calendar concurrently without failures."""
    game = Game.objects.create(name="Valorant")
    today = dt.date.today()
    Event.objects.create(name="Load Test Event", date=today + dt.timedelta(days=1), start_time=dt.time(9),
                         end_time=dt.time(10), location="Arena", visibility=Visibility.PUBLIC)
    ScheduleEntry.objects.create(game=game, title="Load Test Match", date=today + dt.timedelta(days=2),
                                 start_time=dt.time(9), end_time=dt.time(10), visibility=Visibility.COMMUNITY)
    hashed = make_password(PASSWORD)
    users = User.objects.bulk_create(
        User(username=f"load{i}", email=f"load{i}@school.edu", full_name=f"Load User{i}",
             email_verified=True, password=hashed, calendar_token=f"token-{i}")
        for i in range(200)
    )
    CommunityMembership.objects.bulk_create(CommunityMembership(user=u, game=game) for u in users)

    server = _BigBacklogServer(("127.0.0.1", 0), _QuietHandler)
    server.set_app(WSGIHandler())
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    barrier = threading.Barrier(200)

    def session(i):
        jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        barrier.wait(timeout=60)  # everyone starts together
        page = opener.open(f"{base}/login/", timeout=60).read().decode()
        token = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', page).group(1)
        data = urllib.parse.urlencode({"csrfmiddlewaretoken": token, "username": f"load{i}",
                                       "password": PASSWORD}).encode()
        req = urllib.request.Request(f"{base}/login/", data=data, headers={"Referer": f"{base}/login/"})
        dashboard = opener.open(req, timeout=60)
        body = dashboard.read().decode()
        calendar = opener.open(f"{base}/calendar/", timeout=60).read().decode()
        return (dashboard.geturl().endswith("/dashboard/") and f"Welcome, Load" in body
                and "Load Test Event" in calendar and "Load Test Match" in calendar)

    try:
        with ThreadPoolExecutor(max_workers=200) as pool:
            results = list(pool.map(session, range(200)))
    finally:
        server.shutdown()
        server.server_close()
    assert results.count(True) == 200
    assert User.objects.count() == 200  # no corruption / duplicate writes


# --- TC-57 / NFREQ5: desktop interfaces ----------------------------------------------------------

@pytest.mark.django_db
def test_tc57_desktop_interface_available_for_all_roles(client, world, login):
    """TC-57: every role's interfaces render in the desktop layout with role-appropriate navigation."""
    team, game = world["val_team"], world["valorant"]
    common = [reverse("dashboard"), reverse("my_profile"), reverse("calendar"), reverse("game_list"),
              reverse("game_detail", args=[game.slug]), reverse("discord_connect"), reverse("edit_account"),
              reverse("public_profile", args=["member"])]
    player_pages = [reverse("team_list"), reverse("team_detail", args=[team.pk]),
                    reverse("team_vods", args=[team.pk]), reverse("team_stats", args=[team.pk])]
    gm_pages = [reverse("manage_events"), reverse("event_create"), reverse("manage_schedules"),
                reverse("schedule_create"), reverse("manage_teams", args=[game.slug]),
                reverse("manage_analytics", args=[team.pk]), reverse("edit_team", args=[team.pk])]
    admin_pages = [reverse("manage_users"), reverse("manage_user", args=[world["member"].pk]),
                   reverse("audit_log"), reverse("manage_games"), reverse("game_create")]
    cases = [("outsider", common, []), ("player", common + player_pages, ["Teams"]),
             ("gm", common + player_pages + gm_pages, ["Events", "Schedules"]),
             ("admin", common + player_pages + gm_pages + admin_pages, ["Users", "Communities"])]
    for who, pages, nav_items in cases:
        login(world[who])
        for url in pages:
            response = client.get(url)
            assert response.status_code == 200, f"{who} {url} -> {response.status_code}"
            html = response.content.decode()
            assert 'name="viewport"' in html and 'class="mainnav"' in html and "hub.css" in html
        nav = client.get(reverse("dashboard")).content.decode().split('class="mainnav"')[1].split("</nav>")[0]
        for item in nav_items:
            assert f">{item}<" in nav
    login(world["outsider"])
    nav = client.get(reverse("dashboard")).content.decode().split('class="mainnav"')[1].split("</nav>")[0]
    assert ">Users<" not in nav and ">Events<" not in nav


@pytest.mark.django_db
def test_public_pages_render(client):
    for name in ["landing", "login", "register", "resend_verification"]:
        response = client.get(reverse(name))
        assert response.status_code == 200 and b"hub.css" in response.content


@pytest.mark.django_db
def test_stylesheet_defines_desktop_layout():
    css = (Path(__file__).resolve().parent.parent / "static" / "css" / "hub.css").read_text()
    assert ".page { max-width: 1180px" in css and "grid-template-columns" in css


# --- Traceability ---------------------------------------------------------------------------------

def test_every_test_case_is_automated():
    """Every TC-1…TC-57 from docs/source/testCases.md is referenced by at least one automated test."""
    root = Path(__file__).resolve().parent
    spec = (root.parent / "docs" / "source" / "testCases.md").read_text()
    specified = {int(n) for n in re.findall(r"^TC-(\d+):", spec, re.M)}
    assert specified == set(range(1, 58))
    source = "\n".join(p.read_text() for p in root.glob("test_*.py"))
    covered = {int(n) for n in re.findall(r"\btc(\d{2})_", source)}
    covered |= {int(n) for n in re.findall(r"TC-(\d+)", source)}
    missing = sorted(specified - covered)
    assert not missing, f"Test cases without automated tests: {missing}"
