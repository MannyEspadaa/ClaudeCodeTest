from django import forms
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from core import permissions as perms

from . import services
from .models import CommunityMembership, Game, Team

User = get_user_model()


class TeamForm(forms.ModelForm):
    class Meta:
        model = Team
        fields = ("name", "description")
        widgets = {"description": forms.Textarea(attrs={"rows": 3})}

    def __init__(self, *args, game, **kwargs):
        super().__init__(*args, **kwargs)
        self.game = game

    def clean_name(self):
        name = " ".join(self.cleaned_data["name"].split())
        if not name:
            raise forms.ValidationError("Enter a team name.")
        clash = Team.objects.filter(game=self.game, name__iexact=name).exclude(pk=self.instance.pk)
        if clash.exists():
            raise forms.ValidationError(f"{self.game.name} already has a team called {name}.")
        return name


# --- Game communities and rosters (UC-6) -------------------------------------------

@login_required
def game_list(request):
    user = request.user
    memberships = {m.game_id: m for m in CommunityMembership.objects.filter(user=user)}
    games = [
        {"game": g, "membership": memberships.get(g.id), "count": g.active_member_count()}
        for g in Game.objects.all()
    ]
    return render(request, "teams/game_list.html", {"games": games})


@login_required
def game_detail(request, slug):
    game = get_object_or_404(Game, slug=slug)
    user = request.user
    membership = CommunityMembership.objects.filter(user=user, game=game).first()
    is_manager = perms.manages_game(user, game)
    can_see_roster = is_manager or perms.is_community_member(user, game)
    context = {
        "game": game,
        "membership": membership,
        "is_manager": is_manager,
        "can_see_roster": can_see_roster,
        "member_count": game.active_member_count(),
    }
    if can_see_roster:
        context["members"] = game.memberships.filter(status=CommunityMembership.Status.ACTIVE).select_related("user")
        context["teams"] = [t for t in game.teams.all() if perms.can_view_team(user, t)]
    if is_manager:
        context["pending"] = game.memberships.filter(status=CommunityMembership.Status.PENDING).select_related("user")
    return render(request, "teams/game_detail.html", context)


@login_required
@require_POST
def join_game(request, slug):
    game = get_object_or_404(Game, slug=slug)
    try:
        membership = services.join_roster(request.user, game)
    except services.RosterError as exc:
        messages.error(request, str(exc))
    else:
        if membership.status == CommunityMembership.Status.PENDING:
            messages.info(request, f"Your request to join {game.name} is waiting for a Game Manager.")
        else:
            messages.success(request, f"You joined the {game.name} roster.")
    return redirect("game_detail", slug=slug)


@login_required
@require_POST
def leave_game(request, slug):
    game = get_object_or_404(Game, slug=slug)
    try:
        services.leave_roster(request.user, game)
    except services.RosterError as exc:
        messages.error(request, str(exc))
    else:
        messages.success(request, f"You left the {game.name} roster.")
    return redirect("game_detail", slug=slug)


@login_required
@require_POST
def handle_request(request, slug, membership_id, decision):
    game = get_object_or_404(Game, slug=slug)
    if not perms.manages_game(request.user, game):
        raise PermissionDenied("You do not manage this game.")
    membership = get_object_or_404(CommunityMembership, pk=membership_id, game=game)
    if decision not in {"approve", "deny"}:
        raise PermissionDenied("Unknown decision.")
    try:
        if decision == "approve":
            services.approve_request(membership)
            messages.success(request, f"{membership.user.username} joined the roster.")
        else:
            services.deny_request(membership)
            messages.success(request, f"Request from {membership.user.username} denied.")
    except services.RosterError as exc:
        messages.error(request, str(exc))
    return redirect("game_detail", slug=slug)


# --- Teams (UC-7, FREQ26–28, FREQ44) -------------------------------------------------

@login_required
def team_list(request):
    return render(request, "teams/team_list.html", {
        "teams": perms.visible_teams(request.user),
        "managed_games": Game.objects.filter(id__in=perms.managed_game_ids(request.user)),
    })


def _managed_game(request, slug):
    game = get_object_or_404(Game, slug=slug)
    if not perms.manages_game(request.user, game):
        raise PermissionDenied("You are not a Game Manager for this game.")
    return game


@login_required
def manage_teams(request, slug):
    game = _managed_game(request, slug)
    form = TeamForm(request.POST or None, game=game)
    if request.method == "POST" and form.is_valid():
        team = form.save(commit=False)
        team.game = game
        team.save()
        messages.success(request, f"Shell team {team.name} created.")
        return redirect("manage_teams", slug=slug)
    return render(request, "teams/manage_teams.html", {
        "game": game, "teams": game.teams.prefetch_related("memberships__user"), "form": form,
    })


def _team_for_manager(request, pk):
    team = get_object_or_404(Team.objects.select_related("game"), pk=pk)
    if not perms.can_manage_team(request.user, team):
        raise PermissionDenied("You are not a Game Manager for this team's game.")
    return team


@login_required
def team_detail(request, pk):
    team = get_object_or_404(Team.objects.select_related("game"), pk=pk)
    if not perms.can_view_team(request.user, team):
        raise PermissionDenied("This team is only visible to its players and Game Managers.")
    can_manage = perms.can_manage_team(request.user, team)
    return render(request, "teams/team_detail.html", {
        "team": team,
        "members": team.memberships.select_related("user"),
        "can_manage": can_manage,
        "eligible": services.eligible_players(team) if can_manage else [],
    })


@login_required
def edit_team(request, pk):
    team = _team_for_manager(request, pk)
    form = TeamForm(request.POST or None, instance=team, game=team.game)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, f"Team {team.name} updated.")
        return redirect("team_detail", pk=team.pk)
    return render(request, "core/form_page.html", {
        "title": f"Edit {team.name}", "form": form, "submit_label": "Save",
        "cancel_url": reverse("team_detail", args=[team.pk]),
    })


@login_required
def delete_team(request, pk):
    team = _team_for_manager(request, pk)
    if request.method == "POST":
        try:
            services.delete_team(team)
        except services.RosterError as exc:
            messages.error(request, str(exc))
            return redirect("team_detail", pk=team.pk)
        messages.success(request, f"Team {team.name} deleted.")
        return redirect("manage_teams", slug=team.game.slug)
    return render(request, "core/confirm.html", {
        "title": f"Delete {team.name}?",
        "message": "The team and its VODs, statistics and comments will be permanently deleted.",
        "cancel_url": reverse("team_detail", args=[team.pk]),
    })


@login_required
@require_POST
def add_member(request, pk):
    team = _team_for_manager(request, pk)
    user = get_object_or_404(User, pk=request.POST.get("user"))
    try:
        services.add_player(team, user, request.user)
    except services.RosterError as exc:
        messages.error(request, str(exc))
    else:
        messages.success(request, f"{user.username} is now a Player on {team.name}.")
    return redirect("team_detail", pk=team.pk)


@login_required
@require_POST
def remove_member(request, pk, user_id):
    team = _team_for_manager(request, pk)
    user = get_object_or_404(User, pk=user_id)
    try:
        services.remove_player(team, user)
    except services.RosterError as exc:
        messages.error(request, str(exc))
    else:
        messages.success(request, f"{user.username} was removed from {team.name}.")
    return redirect("team_detail", pk=team.pk)
