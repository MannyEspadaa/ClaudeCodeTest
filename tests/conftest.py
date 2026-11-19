import datetime as dt

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from teams.models import CommunityMembership, Game, GameManagerAssignment, Team, TeamMembership

PASSWORD = "Str0ng-Passw0rd!"


@pytest.fixture
def make_user(db):
    User = get_user_model()
    counter = {"n": 0}

    def _make(username=None, *, full_name=None, admin=False, verified=True, status="active", **extra):
        counter["n"] += 1
        username = username or f"user{counter['n']}"
        user = User(
            username=username,
            email=extra.pop("email", f"{username}@school.edu"),
            full_name=full_name or f"{username.title()} Tester",
            email_verified=verified,
            is_administrator=admin,
            status=status,
            **extra,
        )
        user.set_password(PASSWORD)
        user.save()
        return user

    return _make


@pytest.fixture
def login(client):
    def _login(user, c=None):
        c = c or client
        c.force_login(user, backend="accounts.backends.UsernameOrEmailBackend")
        return c

    return _login


@pytest.fixture
def world(make_user):
    """Two games, each with a GM, a team, a player and a community member; plus an admin."""
    valorant = Game.objects.create(name="Valorant", description="Tactical shooter")
    rocket = Game.objects.create(name="Rocket League")
    admin = make_user("admin", admin=True, full_name="Ada Admin")
    gm = make_user("gm", full_name="Gina Manager")
    gm2 = make_user("gm2", full_name="Greg Manager")
    GameManagerAssignment.objects.create(user=gm, game=valorant)
    GameManagerAssignment.objects.create(user=gm2, game=rocket)
    val_team = Team.objects.create(game=valorant, name="Valorant Varsity")
    rl_team = Team.objects.create(game=rocket, name="RL Varsity")
    player = make_user("player", full_name="Pat Player")
    player2 = make_user("player2", full_name="Riley Rocket")
    member = make_user("member", full_name="Morgan Member")
    outsider = make_user("outsider", full_name="Oscar Outsider")
    for user, game in [(player, valorant), (player2, rocket), (member, valorant)]:
        CommunityMembership.objects.create(user=user, game=game)
    TeamMembership.objects.create(team=val_team, user=player, added_by=gm)
    TeamMembership.objects.create(team=rl_team, user=player2, added_by=gm2)
    return {
        "valorant": valorant, "rocket": rocket, "admin": admin, "gm": gm, "gm2": gm2,
        "val_team": val_team, "rl_team": rl_team, "player": player, "player2": player2,
        "member": member, "outsider": outsider,
    }


@pytest.fixture
def tomorrow():
    return timezone.localdate() + dt.timedelta(days=1)
