"""Administrator tools: roles (UC-9), moderation (UC-10), game communities, audit log."""
from functools import wraps

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from core import permissions as perms
from teams.models import Game

from . import services
from .forms import GameForm, GrantGameManagerForm, ModerationForm
from .models import AuditLog

User = get_user_model()


def admin_required(view):
    @wraps(view)
    @login_required
    def wrapper(request, *args, **kwargs):
        if not perms.is_admin(request.user):
            raise PermissionDenied("Only Administrators can use this page.")
        return view(request, *args, **kwargs)
    return wrapper


@admin_required
def user_list(request):
    q = request.GET.get("q", "").strip()
    users = User.objects.all()
    if q:
        users = users.filter(Q(username__icontains=q) | Q(full_name__icontains=q) | Q(email__icontains=q))
    return render(request, "manage/user_list.html", {"users": users[:200], "q": q})


@admin_required
def user_detail(request, pk):
    target = get_object_or_404(User, pk=pk)
    return render(request, "manage/user_detail.html", {
        "target": target,
        "roles": perms.role_labels(target) if target.is_account_active else [],
        "assignments": target.gm_assignments.select_related("game"),
        "grant_form": GrantGameManagerForm(),
        "moderation_form": ModerationForm(),
        "log": AuditLog.objects.filter(target=target)[:20],
    })


def _run(request, target, func, success, *args):
    try:
        func(request.user, target, *args)
    except services.RoleChangeError as exc:
        messages.error(request, str(exc))
    else:
        messages.success(request, success)
    return redirect("manage_user", pk=target.pk)


@admin_required
@require_POST
def user_action(request, pk, action):
    target = get_object_or_404(User, pk=pk)
    reason = ModerationForm(request.POST).data.get("reason", "")[:255]
    if action == "grant_gm":
        form = GrantGameManagerForm(request.POST)
        if not form.is_valid():
            messages.error(request, "Choose the game this Game Manager will manage.")
            return redirect("manage_user", pk=pk)
        game = form.cleaned_data["game"]
        return _run(request, target, services.grant_game_manager,
                    f"{target.username} now manages {game.name}.", game)
    if action == "revoke_gm":
        game = get_object_or_404(Game, pk=request.POST.get("game"))
        return _run(request, target, services.revoke_game_manager,
                    f"{target.username} no longer manages {game.name}.", game)
    simple = {
        "grant_admin": (services.grant_administrator, f"{target.username} is now an Administrator."),
        "revoke_admin": (services.revoke_administrator, f"{target.username} is no longer an Administrator."),
        "reactivate": (services.reactivate_account, f"{target.username} has been reactivated."),
    }
    if action in simple:
        func, msg = simple[action]
        return _run(request, target, func, msg)
    if action == "suspend":
        return _run(request, target, services.suspend_account, f"{target.username} has been suspended.", reason)
    if action == "remove":
        return _run(request, target, services.remove_account, f"{target.username} has been removed.", reason)
    raise PermissionDenied("Unknown action.")


@admin_required
def audit_log(request):
    return render(request, "manage/audit_log.html",
                  {"entries": AuditLog.objects.select_related("actor", "target")[:300]})


# --- Game communities --------------------------------------------------------------

@admin_required
def game_list(request):
    return render(request, "manage/game_list.html", {"games": Game.objects.all()})


@admin_required
def game_edit(request, pk=None):
    game = get_object_or_404(Game, pk=pk) if pk else None
    form = GameForm(request.POST or None, instance=game)
    if request.method == "POST" and form.is_valid():
        saved = form.save()
        messages.success(request, f"Game {saved.name} saved.")
        return redirect("manage_games")
    return render(request, "core/form_page.html", {
        "title": f"Edit {game.name}" if game else "Add game community",
        "form": form, "submit_label": "Save", "cancel_url": reverse("manage_games"),
    })


@admin_required
def game_delete(request, pk):
    game = get_object_or_404(Game, pk=pk)
    if request.method == "POST":
        name = game.name
        game.delete()
        messages.success(request, f"Game {name} deleted.")
        return redirect("manage_games")
    return render(request, "core/confirm.html", {
        "title": f"Delete {game.name}?",
        "message": "This permanently deletes the game community, its teams, schedules, VODs and statistics.",
        "cancel_url": reverse("manage_games"),
    })
