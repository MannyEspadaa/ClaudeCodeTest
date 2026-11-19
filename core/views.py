from django.contrib.auth.decorators import login_required
from django.db import DatabaseError
from django.shortcuts import redirect, render
from django.utils import timezone

from teams.models import CommunityMembership, Game

from . import permissions as perms


def landing(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    return render(request, "core/landing.html")


def _dashboard_context(user):
    today = timezone.localdate()
    context = {
        "events": list(perms.visible_events(user).filter(date__gte=today)[:6]),
        "schedules": list(perms.visible_schedules(user).filter(date__gte=today)[:6]),
        "rosters": list(CommunityMembership.objects.filter(user=user).select_related("game")),
        "teams": list(perms.visible_teams(user).filter(memberships__user=user)),
        "managed_games": list(Game.objects.filter(id__in=perms.managed_game_ids(user))),
        "roles": perms.role_labels(user),
        "is_admin": perms.is_admin(user),
    }
    if context["managed_games"]:
        context["pending_requests"] = CommunityMembership.objects.filter(
            game__in=context["managed_games"], status=CommunityMembership.Status.PENDING
        ).count()
    return context


@login_required
def dashboard(request):
    """Landing page after sign-in (UC-3, FREQ10)."""
    try:
        context = _dashboard_context(request.user)
    except DatabaseError:
        return render(request, "core/error.html", {
            "title": "Dashboard unavailable",
            "message": "We couldn't load your dashboard right now. Please try again later.",
        }, status=503)
    return render(request, "core/dashboard.html", context)


def permission_denied(request, exception=None):
    message = str(exception) if exception and str(exception) else "You do not have permission to do that."
    return render(request, "core/error.html",
                  {"title": "Access denied", "message": message}, status=403)


def not_found(request, exception=None):
    return render(request, "core/error.html",
                  {"title": "Not found", "message": "That page does not exist."}, status=404)
