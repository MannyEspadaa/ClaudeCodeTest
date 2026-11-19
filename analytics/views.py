from urllib.parse import urlparse

from django import forms
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db import DatabaseError, models
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from core import permissions as perms
from teams.models import Team

from . import services
from .models import VOD, ManagerComment, StatsUpload


def _https_urls(field, **kwargs):
    if isinstance(field, models.URLField):
        kwargs["assume_scheme"] = "https"
    return field.formfield(**kwargs)


class VODForm(forms.ModelForm):
    class Meta:
        formfield_callback = _https_urls
        model = VOD
        fields = ("title", "url", "played_on")
        labels = {"url": "Video link (YouTube, Twitch or Vimeo)"}
        widgets = {"played_on": forms.DateInput(attrs={"type": "date"})}

    def clean_url(self):
        url = self.cleaned_data["url"]
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or host not in settings.VOD_ALLOWED_HOSTS:
            raise forms.ValidationError("Unsupported VOD link. Use an https YouTube, Twitch or Vimeo link.")
        return url


class StatsUploadForm(forms.Form):
    file = forms.FileField(label="Team data (.csv)")


class CommentForm(forms.Form):
    body = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), max_length=2000, label="Comment for players")
    upload = forms.IntegerField(required=False, widget=forms.HiddenInput)
    vod = forms.IntegerField(required=False, widget=forms.HiddenInput)

    def clean_body(self):
        body = self.cleaned_data["body"].strip()
        if not body:
            raise forms.ValidationError("Enter a comment.")
        return body


def _viewable_team(request, pk):
    team = get_object_or_404(Team.objects.select_related("game"), pk=pk)
    if not perms.can_view_team(request.user, team):
        raise PermissionDenied("You can only view VODs and statistics for your own team.")
    return team


def _managed_team(request, pk):
    team = get_object_or_404(Team.objects.select_related("game"), pk=pk)
    if not perms.can_manage_team(request.user, team):
        raise PermissionDenied("You can only manage analytics for teams in your assigned games.")
    return team


def _failure(request):
    return render(request, "core/error.html", {
        "title": "Team data unavailable",
        "message": "We couldn't load this team's data right now. Please try again later.",
    }, status=503)


# --- Player views (UC-13, FREQ45, FREQ46) -------------------------------------------

@login_required
def team_vods(request, pk):
    team = _viewable_team(request, pk)
    try:
        vods = list(team.vods.prefetch_related("comments__author"))
    except DatabaseError:
        return _failure(request)
    return render(request, "analytics/vods.html", {
        "team": team, "vods": vods, "can_manage": perms.can_manage_team(request.user, team),
    })


@login_required
def team_stats(request, pk):
    team = _viewable_team(request, pk)
    try:
        stats = getattr(team, "statistics", None)
        uploads = list(team.stats_uploads.prefetch_related("comments__author"))
        recent = list(team.match_records.all()[:25])
        general_comments = list(team.manager_comments.filter(upload__isnull=True, vod__isnull=True)
                                .select_related("author"))
    except DatabaseError:
        return _failure(request)
    return render(request, "analytics/stats.html", {
        "team": team, "stats": stats, "uploads": uploads, "recent": recent,
        "general_comments": general_comments, "can_manage": perms.can_manage_team(request.user, team),
    })


# --- Game Manager tools (UC-8, FREQ29–FREQ31, FREQ43) --------------------------------------

@login_required
def manage_analytics(request, pk):
    team = _managed_team(request, pk)
    vod_form, upload_form, comment_form = VODForm(prefix="vod"), StatsUploadForm(prefix="data"), CommentForm(prefix="c")
    if request.method == "POST":
        action = request.POST.get("action")
        if action == "vod":
            vod_form = VODForm(request.POST, prefix="vod")
            if vod_form.is_valid():
                vod = vod_form.save(commit=False)
                vod.team, vod.uploaded_by = team, request.user
                vod.save()
                messages.success(request, f"VOD {vod.title} added for {team.name}.")
                return redirect("manage_analytics", pk=team.pk)
            messages.error(request, "Upload error: the VOD was not saved.")
        elif action == "data":
            upload_form = StatsUploadForm(request.POST, request.FILES, prefix="data")
            if upload_form.is_valid():
                try:
                    upload = services.import_team_data(team, upload_form.cleaned_data["file"], request.user)
                except services.UploadError as exc:
                    for err in exc.errors:
                        upload_form.add_error("file", err)
                    messages.error(request, "Upload error: no data was saved.")
                else:
                    messages.success(request, f"Imported {upload.row_count} matches; statistics recalculated.")
                    return redirect("manage_analytics", pk=team.pk)
            else:
                messages.error(request, "Upload error: no data was saved.")
        elif action == "comment":
            comment_form = CommentForm(request.POST, prefix="c")
            if comment_form.is_valid():
                data = comment_form.cleaned_data
                upload = get_object_or_404(StatsUpload, pk=data["upload"], team=team) if data["upload"] else None
                vod = get_object_or_404(VOD, pk=data["vod"], team=team) if data["vod"] else None
                ManagerComment.objects.create(team=team, upload=upload, vod=vod,
                                              author=request.user, body=data["body"])
                messages.success(request, "Comment posted for players.")
                return redirect("manage_analytics", pk=team.pk)
            messages.error(request, "The comment was not saved.")
        else:
            raise PermissionDenied("Unknown action.")
    return render(request, "analytics/manage.html", {
        "team": team,
        "vod_form": vod_form, "upload_form": upload_form, "comment_form": comment_form,
        "vods": team.vods.all(), "uploads": team.stats_uploads.all(),
        "comments": team.manager_comments.select_related("author", "upload", "vod"),
        "stats": getattr(team, "statistics", None),
        "required_columns": ", ".join(services.REQUIRED_COLUMNS),
    })


@login_required
@require_POST
def delete_vod(request, pk):
    vod = get_object_or_404(VOD.objects.select_related("team__game"), pk=pk)
    if not perms.can_manage_team(request.user, vod.team):
        raise PermissionDenied("You cannot manage this team's VODs.")
    vod.delete()
    messages.success(request, "VOD removed.")
    return redirect("manage_analytics", pk=vod.team_id)


@login_required
@require_POST
def delete_upload(request, pk):
    upload = get_object_or_404(StatsUpload.objects.select_related("team__game"), pk=pk)
    if not perms.can_manage_team(request.user, upload.team):
        raise PermissionDenied("You cannot manage this team's data.")
    services.delete_upload(upload)
    messages.success(request, "Upload removed; statistics recalculated.")
    return redirect("manage_analytics", pk=upload.team_id)


@login_required
@require_POST
def delete_comment(request, pk):
    comment = get_object_or_404(ManagerComment.objects.select_related("team__game"), pk=pk)
    user = request.user
    if not (perms.is_admin(user) or (comment.author_id == user.pk and perms.can_manage_team(user, comment.team))):
        raise PermissionDenied("Only the author or an Administrator can delete this comment.")
    comment.delete()
    messages.success(request, "Comment deleted.")
    return redirect(reverse("manage_analytics", args=[comment.team_id]))
