"""Role management and moderation rules (UC-9, UC-10, DECISIONS D10)."""
from django.contrib.auth import get_user_model
from django.db import transaction

from teams.models import CommunityMembership, GameManagerAssignment, TeamMembership

from .models import audit

User = get_user_model()


class RoleChangeError(Exception):
    """An invalid role configuration or moderation request."""


def _active_admin_count():
    return User.objects.filter(is_administrator=True, status=User.Status.ACTIVE).count()


def _require_eligible(target):
    if target.status != User.Status.ACTIVE:
        raise RoleChangeError("Roles can only be granted to active accounts.")
    if not target.email_verified:
        raise RoleChangeError("Roles can only be granted to accounts with a verified email.")


@transaction.atomic
def grant_game_manager(actor, target, game):
    if game is None:
        raise RoleChangeError("Choose the game this Game Manager will manage.")
    _require_eligible(target)
    _, created = GameManagerAssignment.objects.get_or_create(user=target, game=game)
    if not created:
        raise RoleChangeError(f"{target.username} already manages {game.name}.")
    audit(actor, target, "grant_game_manager", game.name)


@transaction.atomic
def revoke_game_manager(actor, target, game):
    deleted, _ = GameManagerAssignment.objects.filter(user=target, game=game).delete()
    if not deleted:
        raise RoleChangeError(f"{target.username} does not manage {game.name}.")
    audit(actor, target, "revoke_game_manager", game.name)


@transaction.atomic
def grant_administrator(actor, target):
    _require_eligible(target)
    if target.is_administrator:
        raise RoleChangeError(f"{target.username} is already an Administrator.")
    target.is_administrator = True
    target.save(update_fields=["is_administrator"])
    audit(actor, target, "grant_administrator")


@transaction.atomic
def revoke_administrator(actor, target):
    if not target.is_administrator:
        raise RoleChangeError(f"{target.username} is not an Administrator.")
    if _active_admin_count() <= 1:
        raise RoleChangeError("The last active Administrator cannot be removed.")
    target.is_administrator = False
    target.save(update_fields=["is_administrator"])
    audit(actor, target, "revoke_administrator")


def _check_moderation(actor, target):
    if actor.pk == target.pk:
        raise RoleChangeError("You cannot moderate your own account.")
    if target.is_administrator and target.status == User.Status.ACTIVE and _active_admin_count() <= 1:
        raise RoleChangeError("The last active Administrator cannot be moderated.")


@transaction.atomic
def suspend_account(actor, target, reason=""):
    _check_moderation(actor, target)
    if target.status != User.Status.ACTIVE:
        raise RoleChangeError("Only active accounts can be suspended.")
    target.status = User.Status.SUSPENDED
    target.status_reason = reason
    target.save()
    audit(actor, target, "suspend_account", reason)


@transaction.atomic
def reactivate_account(actor, target):
    if target.status == User.Status.ACTIVE:
        raise RoleChangeError("This account is already active.")
    target.status = User.Status.ACTIVE
    target.status_reason = ""
    target.save()
    audit(actor, target, "reactivate_account")


@transaction.atomic
def remove_account(actor, target, reason=""):
    """Deactivate and strip memberships/roles; the record is kept for audit (TC-43)."""
    _check_moderation(actor, target)
    if target.status == User.Status.DEACTIVATED:
        raise RoleChangeError("This account has already been removed.")
    TeamMembership.objects.filter(user=target).delete()
    CommunityMembership.objects.filter(user=target).delete()
    GameManagerAssignment.objects.filter(user=target).delete()
    target.is_administrator = False
    target.status = User.Status.DEACTIVATED
    target.status_reason = reason
    target.save()
    audit(actor, target, "remove_account", reason)
