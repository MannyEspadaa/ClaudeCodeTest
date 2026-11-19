"""Single source of truth for authorization (NFREQ4, DECISIONS D2).

Every view and every list query asks this module. Roles are derived from
scoped data and follow the hierarchy User < Community Member < Player, with
Game Manager scoped to assigned games and Administrator global.
"""
from django.db.models import Q

from scheduling.models import Event, ScheduleEntry, Visibility
from teams.models import CommunityMembership, Game, GameManagerAssignment, Team, TeamMembership


def _ok(user):
    return bool(user and user.is_authenticated and user.is_account_active)


# --- Role predicates -------------------------------------------------------

def is_admin(user):
    return _ok(user) and user.is_administrator


def managed_game_ids(user):
    if not _ok(user):
        return set()
    if user.is_administrator:
        return set(Game.objects.values_list("id", flat=True))
    return set(GameManagerAssignment.objects.filter(user=user).values_list("game_id", flat=True))


def is_game_manager(user):
    return _ok(user) and GameManagerAssignment.objects.filter(user=user).exists()


def manages_game(user, game):
    if not _ok(user) or game is None:
        return False
    if user.is_administrator:
        return True
    return GameManagerAssignment.objects.filter(user=user, game=game).exists()


def player_team_ids(user):
    if not _ok(user):
        return set()
    return set(TeamMembership.objects.filter(user=user).values_list("team_id", flat=True))


def community_game_ids(user):
    """Games where the user is a Community Member (Players inherit it)."""
    if not _ok(user):
        return set()
    ids = set(
        CommunityMembership.objects.filter(user=user, status=CommunityMembership.Status.ACTIVE)
        .values_list("game_id", flat=True)
    )
    ids |= set(TeamMembership.objects.filter(user=user).values_list("team__game_id", flat=True))
    return ids


def is_community_member(user, game):
    return game is not None and game.id in community_game_ids(user)


def is_player(user, team):
    return _ok(user) and TeamMembership.objects.filter(user=user, team=team).exists()


def role_labels(user):
    if not _ok(user):
        return []
    labels = ["User"]
    if community_game_ids(user):
        labels.append("Community Member")
    if player_team_ids(user):
        labels.append("Player")
    if GameManagerAssignment.objects.filter(user=user).exists():
        labels.append("Game Manager")
    if user.is_administrator:
        labels.append("Administrator")
    return labels


# --- Teams -------------------------------------------------------------------

def can_view_team(user, team):
    """Admins see all teams; GMs their games' teams; Players their own (userContext Q4)."""
    if not _ok(user):
        return False
    return manages_game(user, team.game) or is_player(user, team)


def can_manage_team(user, team):
    return manages_game(user, team.game)


def visible_teams(user):
    if not _ok(user):
        return Team.objects.none()
    if user.is_administrator:
        return Team.objects.select_related("game").all()
    return (
        Team.objects.select_related("game")
        .filter(Q(game_id__in=managed_game_ids(user)) | Q(id__in=player_team_ids(user)))
        .distinct()
    )


# --- Events and schedules --------------------------------------------------

def can_manage_events(user):
    return is_admin(user) or is_game_manager(user)


def can_manage_event(user, event):
    if is_admin(user):
        return True
    return event.game is not None and manages_game(user, event.game)


def can_manage_schedule(user, entry_or_game):
    game = getattr(entry_or_game, "game", entry_or_game)
    return manages_game(user, game)


def _visibility_filter(user):
    """Q filter shared by events and schedule entries (FREQ19, FREQ38, TC-49)."""
    managed = managed_game_ids(user)
    community = community_game_ids(user)
    teams = player_team_ids(user)
    return (
        Q(visibility=Visibility.PUBLIC)
        | Q(game_id__in=managed)
        | Q(visibility=Visibility.COMMUNITY, game_id__in=community)
        | Q(visibility=Visibility.COMMUNITY, game__isnull=True)
        | Q(visibility=Visibility.TEAM, team_id__in=teams)
        | Q(visibility=Visibility.TEAM, team__isnull=True, game_id__in=community)
    )


def visible_events(user):
    if not _ok(user):
        return Event.objects.none()
    if user.is_administrator:
        return Event.objects.select_related("game", "team").all()
    return Event.objects.select_related("game", "team").filter(_visibility_filter(user))


def visible_schedules(user):
    if not _ok(user):
        return ScheduleEntry.objects.none()
    if user.is_administrator:
        return ScheduleEntry.objects.select_related("game", "team").all()
    return ScheduleEntry.objects.select_related("game", "team").filter(_visibility_filter(user))


def can_view_item(user, item):
    model = type(item)
    qs = visible_events(user) if model is Event else visible_schedules(user)
    return qs.filter(pk=item.pk).exists()


# --- Accounts ----------------------------------------------------------------

def can_manage_roles(user):
    return is_admin(user)


def can_moderate(user):
    return is_admin(user)
