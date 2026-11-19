"""Roster and team rules (UC-6, UC-7, promotion; DECISIONS D3)."""
from django.db import transaction

from .models import CommunityMembership, Game, Team, TeamMembership


class RosterError(Exception):
    pass


@transaction.atomic
def join_roster(user, game):
    """Join a game's roster. Returns the membership (active or pending)."""
    game = Game.objects.select_for_update().get(pk=game.pk)
    existing = CommunityMembership.objects.filter(user=user, game=game).first()
    if existing:
        if existing.status == CommunityMembership.Status.PENDING:
            raise RosterError(f"Your request to join {game.name} is already waiting for approval.")
        raise RosterError(f"You are already on the {game.name} roster.")
    if game.is_full():
        raise RosterError(f"The {game.name} roster is full.")
    status = (CommunityMembership.Status.PENDING if game.join_requires_approval
              else CommunityMembership.Status.ACTIVE)
    return CommunityMembership.objects.create(user=user, game=game, status=status)


@transaction.atomic
def leave_roster(user, game):
    membership = CommunityMembership.objects.filter(user=user, game=game).first()
    if membership is None:
        raise RosterError(f"You are not on the {game.name} roster.")
    team = Team.objects.filter(game=game, memberships__user=user).first()
    if team is not None:
        raise RosterError(
            f"You are a Player on {team.name}. Ask a Game Manager to remove you from the team first."
        )
    membership.delete()


@transaction.atomic
def approve_request(membership):
    game = Game.objects.select_for_update().get(pk=membership.game_id)
    if membership.status != CommunityMembership.Status.PENDING:
        raise RosterError("This request has already been handled.")
    if game.is_full():
        raise RosterError(f"The {game.name} roster is full.")
    membership.status = CommunityMembership.Status.ACTIVE
    membership.save(update_fields=["status"])


def deny_request(membership):
    if membership.status != CommunityMembership.Status.PENDING:
        raise RosterError("This request has already been handled.")
    membership.delete()


def eligible_players(team):
    """Active Community Members of the team's game who are not yet on one of its teams."""
    on_teams = TeamMembership.objects.filter(team__game=team.game).values("user_id")
    return (
        CommunityMembership.objects.filter(game=team.game, status=CommunityMembership.Status.ACTIVE,
                                           user__status="active")
        .exclude(user_id__in=on_teams).select_related("user").order_by("user__username")
    )


@transaction.atomic
def add_player(team, user, added_by):
    """Move a Community Member into a team, making them a Player (TC-32)."""
    if not CommunityMembership.objects.filter(
        user=user, game=team.game, status=CommunityMembership.Status.ACTIVE
    ).exists():
        raise RosterError(f"{user.username} must be on the {team.game.name} roster first.")
    other = TeamMembership.objects.filter(user=user, team__game=team.game).select_related("team").first()
    if other is not None:
        raise RosterError(f"{user.username} is already on {other.team.name}.")
    return TeamMembership.objects.create(team=team, user=user, added_by=added_by)


def remove_player(team, user):
    deleted, _ = TeamMembership.objects.filter(team=team, user=user).delete()
    if not deleted:
        raise RosterError(f"{user.username} is not on {team.name}.")


def delete_team(team):
    if not team.is_shell:
        raise RosterError("Only shell teams (no members) can be deleted. Remove the players first.")
    team.delete()
