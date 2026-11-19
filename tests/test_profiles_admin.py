"""UC-2 profiles, UC-9 roles, UC-10 moderation, UC-11 Discord.

FREQ6–FREQ9, FREQ32–FREQ34, FREQ36, FREQ37, FREQ42, NFREQ4.
Covers TC-6, TC-7, TC-8, TC-38–TC-46.
"""
import pytest
from django.contrib.auth import get_user_model
from django.db import DatabaseError
from django.urls import reverse

from accounts.models import AuditLog
from core import permissions as perms
from integrations.discord import BaseDiscordProvider, DiscordAuthError
from teams.models import CommunityMembership, GameManagerAssignment, TeamMembership

from .conftest import PASSWORD

User = get_user_model()


# --- Profiles ---------------------------------------------------------------------

@pytest.mark.django_db
def test_tc06_view_own_profile(client, world, login):
    """TC-6: full name, username, email, joined rosters and Discord (if connected)."""
    player = world["player"]
    login(player)
    content = client.get(reverse("my_profile")).content.decode()
    for text in ["Pat Player", "player", "player@school.edu", "Valorant", "Valorant Varsity", "Not connected"]:
        assert text in content
    player.discord_username = "patp#1"
    player.save()
    assert "patp#1" in client.get(reverse("my_profile")).content.decode()


@pytest.mark.django_db
def test_tc07_view_another_user_profile(client, world, login):
    """TC-7: another user's first name, username, rosters and Discord; no email or full name."""
    player = world["player"]
    player.discord_username = "patp"
    player.save()
    login(world["member"])
    content = client.get(reverse("public_profile", args=["player"])).content.decode()
    assert "Pat" in content and "player" in content and "Valorant" in content and "patp" in content
    assert "player@school.edu" not in content
    assert "Pat Player" not in content
    # D5: a community member is not on Valorant Varsity, so the team is hidden from them.
    assert "Valorant Varsity" not in content


@pytest.mark.django_db
def test_profile_shows_team_to_teammates_and_managers(client, world, login):
    login(world["gm"])
    assert "Valorant Varsity" in client.get(reverse("public_profile", args=["player"])).content.decode()


@pytest.mark.django_db
def test_tc08_profile_retrieval_failure(client, world, login, monkeypatch):
    """TC-8: database failure shows an error and no partial profile data."""
    import accounts.views

    def boom(user):
        raise DatabaseError("database unavailable")

    monkeypatch.setattr(accounts.views, "_rosters", boom)
    login(world["player"])
    for url in [reverse("my_profile"), reverse("public_profile", args=["member"])]:
        response = client.get(url)
        assert response.status_code == 503
        content = response.content.decode()
        assert "Profile unavailable" in content
        assert "player@school.edu" not in content


@pytest.mark.django_db
def test_edit_own_account(client, world, login):
    login(world["member"])
    client.post(reverse("edit_account"), {"full_name": "Morgan  Q  Member"})
    world["member"].refresh_from_db()
    assert world["member"].full_name == "Morgan  Q  Member"


# --- Roles (UC-9) -------------------------------------------------------------------

def act(client, user, action, **data):
    return client.post(reverse("manage_user_action", args=[user.pk, action]), data, follow=True)


@pytest.mark.django_db
def test_tc38_grant_game_manager_role(client, world, login):
    """TC-38: user receives GM role for a game and gains GM permissions."""
    target, game = world["member"], world["valorant"]
    login(world["admin"])
    response = act(client, target, "grant_gm", game=game.pk)
    assert b"now manages Valorant" in response.content
    assert perms.manages_game(target, game)
    assert "Game Manager" in perms.role_labels(target)
    assert AuditLog.objects.filter(target=target, action="grant_game_manager").exists()
    login(target)
    assert client.get(reverse("manage_teams", args=[game.slug])).status_code == 200


@pytest.mark.django_db
def test_tc39_revoke_game_manager_role(client, world, login):
    """TC-39: the GM role and its permissions are removed."""
    gm, game = world["gm"], world["valorant"]
    login(world["admin"])
    act(client, gm, "revoke_gm", game=game.pk)
    assert not GameManagerAssignment.objects.filter(user=gm).exists()
    assert "Game Manager" not in perms.role_labels(gm)
    login(gm)
    assert client.get(reverse("manage_teams", args=[game.slug])).status_code == 403
    assert client.get(reverse("manage_events")).status_code == 403


@pytest.mark.django_db
def test_tc40_grant_administrator_role(client, world, login):
    """TC-40: the user becomes an Administrator with admin permissions."""
    target = world["member"]
    login(world["admin"])
    act(client, target, "grant_admin")
    target.refresh_from_db()
    assert target.is_administrator
    login(target)
    assert client.get(reverse("manage_users")).status_code == 200


@pytest.mark.django_db
def test_invalid_role_configurations_rejected(client, world, login, make_user):
    """UC-9 extension: invalid role changes are rejected with an error."""
    admin = world["admin"]
    login(admin)
    # missing game
    assert b"Choose the game" in act(client, world["member"], "grant_gm").content
    # duplicate assignment
    assert b"already manages" in act(client, world["gm"], "grant_gm", game=world["valorant"].pk).content
    # unverified account
    pending = make_user("pending", verified=False)
    assert b"verified email" in act(client, pending, "grant_admin").content
    assert not User.objects.get(pk=pending.pk).is_administrator
    # last administrator
    assert b"last active Administrator" in act(client, admin, "revoke_admin").content
    assert User.objects.get(pk=admin.pk).is_administrator


@pytest.mark.django_db
def test_tc41_prevent_non_administrator_from_managing_roles(client, world, login):
    """TC-41: non-admins (including GMs) cannot see or use role management."""
    for who in ["member", "player", "gm"]:
        login(world[who])
        assert client.get(reverse("manage_users")).status_code == 403
        assert act(client, world["outsider"], "grant_admin").status_code == 403
        assert act(client, world["outsider"], "grant_gm", game=world["valorant"].pk).status_code == 403
    assert not User.objects.get(pk=world["outsider"].pk).is_administrator
    assert not GameManagerAssignment.objects.filter(user=world["outsider"]).exists()


# --- Moderation (UC-10) ------------------------------------------------------------

@pytest.mark.django_db
def test_tc42_suspend_user_account(client, world, login):
    """TC-42: account suspended, status stored, sessions ended and sign-in blocked; reversible."""
    from django.test import Client

    target = world["member"]
    victim_client = Client()
    login(target, victim_client)
    login(world["admin"])
    act(client, target, "suspend", reason="Spam")
    target.refresh_from_db()
    assert target.status == User.Status.SUSPENDED and target.status_reason == "Spam"
    assert AuditLog.objects.filter(target=target, action="suspend_account").exists()
    # existing session is ended on the next request
    response = victim_client.get(reverse("dashboard"))
    assert response.status_code == 302 and response.url == reverse("login")
    assert victim_client.get(reverse("dashboard")).status_code == 302
    # and sign-in is refused with an explanation
    refused = Client().post(reverse("login"), {"username": "member", "password": PASSWORD})
    assert b"suspended" in refused.content
    # reactivation restores access
    act(client, target, "reactivate")
    target.refresh_from_db()
    assert target.status == User.Status.ACTIVE


@pytest.mark.django_db
def test_tc43_remove_user_account(client, world, login):
    """TC-43: removed account cannot be used, loses memberships/roles, record kept for audit."""
    from django.test import Client

    target = world["player"]
    login(world["admin"])
    act(client, target, "remove", reason="Left program")
    target.refresh_from_db()
    assert target.status == User.Status.DEACTIVATED and not target.is_active
    assert not TeamMembership.objects.filter(user=target).exists()
    assert not CommunityMembership.objects.filter(user=target).exists()
    assert b"removed" in Client().post(reverse("login"), {"username": "player", "password": PASSWORD}).content
    login(world["member"])
    assert client.get(reverse("public_profile", args=["player"])).status_code == 404


@pytest.mark.django_db
def test_admin_cannot_moderate_self(client, world, login):
    admin = world["admin"]
    login(admin)
    assert b"your own account" in act(client, admin, "suspend").content
    admin.refresh_from_db()
    assert admin.status == User.Status.ACTIVE


@pytest.mark.django_db
def test_tc44_prevent_non_administrator_from_moderating(client, world, login):
    """TC-44: non-admins cannot suspend or remove accounts."""
    target = world["outsider"]
    for who in ["member", "player", "gm"]:
        login(world[who])
        assert act(client, target, "suspend").status_code == 403
        assert act(client, target, "remove").status_code == 403
    target.refresh_from_db()
    assert target.status == User.Status.ACTIVE


@pytest.mark.django_db
def test_admin_manages_game_communities(client, world, login):
    login(world["admin"])
    client.post(reverse("game_create"), {"name": "Overwatch", "description": "", "roster_capacity": "10"})
    from teams.models import Game
    game = Game.objects.get(name="Overwatch")
    assert game.slug == "overwatch" and game.roster_capacity == 10
    login(world["gm"])
    assert client.get(reverse("game_create")).status_code == 403


# --- Discord (UC-11) ------------------------------------------------------------------

def connect_discord(client, approve=True, username="pat#1234"):
    response = client.post(reverse("discord_connect"))
    assert response.status_code == 302
    authorize_url = response.url
    state = authorize_url.split("state=")[1]
    data = {"state": state, "discord_username": username}
    data["approve" if approve else "deny"] = "1"
    callback = client.post(reverse("discord_local_authorize"), data)
    return client.get(callback.url, follow=True)


@pytest.mark.django_db
def test_tc45_link_discord_account(client, world, login):
    """TC-45: redirected to Discord authorization; on approval the username shows on the profile."""
    login(world["member"])
    response = connect_discord(client)
    assert b"Discord account pat#1234 linked" in response.content
    member = User.objects.get(pk=world["member"].pk)
    assert member.discord_username == "pat#1234"
    assert "pat#1234" in client.get(reverse("my_profile")).content.decode()
    login(world["player"])
    assert "pat#1234" in client.get(reverse("public_profile", args=["member"])).content.decode()


@pytest.mark.django_db
def test_tc46_handle_discord_authentication_failure(client, world, login):
    """TC-46: rejected authorization links nothing and shows an authentication error."""
    login(world["member"])
    response = connect_discord(client, approve=False)
    assert b"Discord authentication failed" in response.content
    assert User.objects.get(pk=world["member"].pk).discord_username == ""


class RejectingProvider(BaseDiscordProvider):
    def authorize_url(self, request, state):
        return f"/discord/callback/?code=abc&state={state}"

    def exchange(self, request, code):
        raise DiscordAuthError("rejected")


@pytest.mark.django_db
def test_tc46_discord_api_rejects_code(client, world, login, settings):
    settings.DISCORD_PROVIDER = "tests.test_profiles_admin.RejectingProvider"
    login(world["member"])
    response = client.get(client.post(reverse("discord_connect")).url, follow=True)
    assert b"Discord authentication failed" in response.content
    assert User.objects.get(pk=world["member"].pk).discord_username == ""


@pytest.mark.django_db
def test_discord_callback_rejects_forged_state(client, world, login):
    login(world["member"])
    client.post(reverse("discord_connect"))
    from integrations.discord import LocalDiscordProvider
    code = LocalDiscordProvider.make_code("evil")
    response = client.get(f"{reverse('discord_callback')}?code={code}&state=forged", follow=True)
    assert b"Discord authentication failed" in response.content
    assert User.objects.get(pk=world["member"].pk).discord_username == ""


@pytest.mark.django_db
def test_unlink_discord(client, world, login):
    login(world["member"])
    connect_discord(client)
    client.post(reverse("discord_unlink"))
    assert User.objects.get(pk=world["member"].pk).discord_username == ""
