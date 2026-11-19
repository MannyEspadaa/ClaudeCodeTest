"""UC-6 rosters, UC-7 teams, promotion to Player.

FREQ20, FREQ22, FREQ26–FREQ28, FREQ44, FREQ45, FREQ46, NFREQ4.
Covers TC-23–TC-32.
"""
import pytest
from django.urls import reverse

from core import permissions as perms
from teams.models import CommunityMembership, Game, Team, TeamMembership


def join(client, game):
    return client.post(reverse("join_game", args=[game.slug]), follow=True)


def leave(client, game):
    return client.post(reverse("leave_game", args=[game.slug]), follow=True)


@pytest.mark.django_db
def test_tc23_join_roster(client, world, login):
    """TC-23: joining adds the user to the roster and stores the membership."""
    outsider, game = world["outsider"], world["valorant"]
    login(outsider)
    response = join(client, game)
    assert b"You joined the Valorant roster" in response.content
    assert CommunityMembership.objects.filter(user=outsider, game=game, status="active").exists()
    assert perms.is_community_member(outsider, game)
    assert "Community Member" in perms.role_labels(outsider)
    assert b"Already" not in response.content
    # cannot join twice
    assert b"already on the Valorant roster" in join(client, game).content


@pytest.mark.django_db
def test_tc24_leave_roster(client, world, login):
    """TC-24: leaving removes the member and stores the change."""
    member, game = world["member"], world["valorant"]
    login(member)
    assert b"You left the Valorant roster" in leave(client, game).content
    assert not CommunityMembership.objects.filter(user=member, game=game).exists()
    assert not perms.is_community_member(member, game)


@pytest.mark.django_db
def test_player_must_be_removed_from_team_before_leaving_roster(client, world, login):
    login(world["player"])
    assert b"Ask a Game Manager" in leave(client, world["valorant"]).content
    assert CommunityMembership.objects.filter(user=world["player"], game=world["valorant"]).exists()


@pytest.mark.django_db
def test_join_requires_approval_when_configured(client, world, login):
    """UC-6 main flow: request forwarded, Game Manager approves, membership updated."""
    game = world["valorant"]
    game.join_requires_approval = True
    game.save()
    outsider = world["outsider"]
    login(outsider)
    assert b"waiting for a Game Manager" in join(client, game).content
    membership = CommunityMembership.objects.get(user=outsider, game=game)
    assert membership.status == "pending"
    assert not perms.is_community_member(outsider, game)
    # other game's GM cannot approve
    login(world["gm2"])
    url = reverse("roster_request", args=[game.slug, membership.pk, "approve"])
    assert client.post(url).status_code == 403
    login(world["gm"])
    client.post(url)
    membership.refresh_from_db()
    assert membership.status == "active"
    assert perms.is_community_member(outsider, game)


@pytest.mark.django_db
def test_game_manager_can_deny_request(client, world, login):
    game = world["valorant"]
    game.join_requires_approval = True
    game.save()
    login(world["outsider"])
    join(client, game)
    membership = CommunityMembership.objects.get(user=world["outsider"], game=game)
    login(world["gm"])
    client.post(reverse("roster_request", args=[game.slug, membership.pk, "deny"]))
    assert not CommunityMembership.objects.filter(pk=membership.pk).exists()


@pytest.mark.django_db
def test_tc25_prevent_unauthorized_roster_access(client, world, login):
    """TC-25: restricted rosters (team rosters, other games' member lists, GM actions) are denied."""
    member = world["member"]  # Valorant community member, not on a team
    login(member)
    # team roster of own game's team: restricted to its players / GMs
    assert client.get(reverse("team_detail", args=[world["val_team"].pk])).status_code == 403
    # another game's team
    assert client.get(reverse("team_detail", args=[world["rl_team"].pk])).status_code == 403
    # cannot modify a team roster
    before = TeamMembership.objects.count()
    assert client.post(reverse("add_team_member", args=[world["val_team"].pk]), {"user": member.pk}).status_code == 403
    assert client.post(reverse("remove_team_member", args=[world["val_team"].pk, world["player"].pk])).status_code == 403
    assert TeamMembership.objects.count() == before
    # member list of a game community they're not in is hidden
    content = client.get(reverse("game_detail", args=[world["rocket"].slug])).content.decode()
    assert "player2" not in content and "Join the roster to see its members" in content


@pytest.mark.django_db
def test_tc26_prevent_joining_full_roster(client, world, login):
    """TC-26: a full roster refuses joins; membership unchanged."""
    game = world["valorant"]
    game.roster_capacity = game.active_member_count()
    game.save()
    login(world["outsider"])
    assert b"roster is full" in join(client, game).content
    assert not CommunityMembership.objects.filter(user=world["outsider"], game=game).exists()


# --- Teams (UC-7) ----------------------------------------------------------------------

@pytest.mark.django_db
def test_tc27_create_team_for_assigned_game(client, world, login):
    """TC-27: GM creates a shell team that appears on the management page."""
    game = world["valorant"]
    login(world["gm"])
    response = client.post(reverse("manage_teams", args=[game.slug]), {"name": "Valorant JV"}, follow=True)
    assert b"Shell team Valorant JV created" in response.content
    team = Team.objects.get(name="Valorant JV")
    assert team.game == game and team.is_shell
    assert b"Valorant JV" in client.get(reverse("manage_teams", args=[game.slug])).content


@pytest.mark.django_db
def test_tc28_modify_team_for_assigned_game(client, world, login):
    """TC-28: GM updates team information."""
    team = world["val_team"]
    login(world["gm"])
    client.post(reverse("edit_team", args=[team.pk]), {"name": "Valorant Gold", "description": "Top squad"})
    team.refresh_from_db()
    assert team.name == "Valorant Gold" and team.description == "Top squad"


@pytest.mark.django_db
def test_tc29_delete_shell_team(client, world, login):
    """TC-29: shell team deleted; teams with players are protected."""
    game = world["valorant"]
    shell = Team.objects.create(game=game, name="Zephyr Shell")
    login(world["gm"])
    client.post(reverse("delete_team", args=[shell.pk]))
    assert not Team.objects.filter(pk=shell.pk).exists()
    page = client.get(reverse("manage_teams", args=[game.slug])).content.decode()
    assert "Team Zephyr Shell deleted" in page
    assert f'href="/teams/{shell.pk}/"' not in page
    response = client.post(reverse("delete_team", args=[world["val_team"].pk]), follow=True)
    assert b"Only shell teams" in response.content
    assert Team.objects.filter(pk=world["val_team"].pk).exists()


@pytest.mark.django_db
def test_tc30_prevent_managing_unassigned_team(client, world, login):
    """TC-30: a GM cannot create, modify or delete teams in another game."""
    rocket, rl_team = world["rocket"], world["rl_team"]
    login(world["gm"])  # manages Valorant only
    assert client.get(reverse("manage_teams", args=[rocket.slug])).status_code == 403
    assert client.post(reverse("manage_teams", args=[rocket.slug]), {"name": "Hijack"}).status_code == 403
    assert client.post(reverse("edit_team", args=[rl_team.pk]), {"name": "Hijacked"}).status_code == 403
    assert client.post(reverse("delete_team", args=[rl_team.pk])).status_code == 403
    rl_team.refresh_from_db()
    assert rl_team.name == "RL Varsity"
    assert not Team.objects.filter(name="Hijack").exists()


@pytest.mark.django_db
@pytest.mark.parametrize("name", ["", "   "])
def test_tc31_reject_team_without_name(client, world, login, name):
    """TC-31: blank team name rejected, nothing created."""
    login(world["gm"])
    count = Team.objects.count()
    response = client.post(reverse("manage_teams", args=[world["valorant"].slug]), {"name": name})
    assert b"This field is required" in response.content or b"Enter a team name" in response.content
    assert Team.objects.count() == count


@pytest.mark.django_db
def test_duplicate_team_name_rejected(client, world, login):
    login(world["gm"])
    response = client.post(reverse("manage_teams", args=[world["valorant"].slug]), {"name": "valorant varsity"})
    assert b"already has a team" in response.content


@pytest.mark.django_db
def test_tc32_promote_community_member_to_player(client, world, login):
    """TC-32: moving a community member into a team makes them a Player with inherited permissions."""
    member, team = world["member"], world["val_team"]
    login(member)
    assert client.get(reverse("team_vods", args=[team.pk])).status_code == 403
    login(world["gm"])
    response = client.post(reverse("add_team_member", args=[team.pk]), {"user": member.pk}, follow=True)
    assert b"is now a Player on Valorant Varsity" in response.content
    assert perms.is_player(member, team)
    roles = perms.role_labels(member)
    assert {"User", "Community Member", "Player"} <= set(roles)
    login(member)
    assert client.get(reverse("team_vods", args=[team.pk])).status_code == 200
    assert client.get(reverse("team_stats", args=[team.pk])).status_code == 200
    assert client.get(reverse("dashboard")).status_code == 200  # still has User features


@pytest.mark.django_db
def test_promotion_requires_community_membership_and_one_team_per_game(client, world, login):
    login(world["gm"])
    team = world["val_team"]
    response = client.post(reverse("add_team_member", args=[team.pk]), {"user": world["outsider"].pk}, follow=True)
    assert b"must be on the Valorant roster first" in response.content
    second = Team.objects.create(game=world["valorant"], name="Second")
    response = client.post(reverse("add_team_member", args=[second.pk]), {"user": world["player"].pk}, follow=True)
    assert b"already on Valorant Varsity" in response.content


@pytest.mark.django_db
def test_removing_player_returns_them_to_community_member(client, world, login):
    player, team = world["player"], world["val_team"]
    login(world["gm"])
    client.post(reverse("remove_team_member", args=[team.pk, player.pk]))
    assert not perms.is_player(player, team)
    assert perms.is_community_member(player, world["valorant"])


@pytest.mark.django_db
def test_team_list_visibility(client, world, login):
    """userContext Q4: admin sees all teams, GM and players only their own."""
    def names(user):
        return {t.name for t in perms.visible_teams(user)}
    assert names(world["admin"]) == {"Valorant Varsity", "RL Varsity"}
    assert names(world["gm"]) == {"Valorant Varsity"}
    assert names(world["player"]) == {"Valorant Varsity"}
    assert names(world["member"]) == set()


@pytest.mark.django_db
def test_game_list_and_detail_render(client, world, login):
    login(world["member"])
    content = client.get(reverse("game_list")).content.decode()
    assert "Valorant" in content and "Rocket League" in content
    detail = client.get(reverse("game_detail", args=[world["valorant"].slug])).content.decode()
    assert "member" in detail and "player" in detail  # roster visible to community members
    assert Game.objects.count() == 2
