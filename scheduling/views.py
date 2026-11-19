from collections import OrderedDict
from datetime import datetime, timedelta

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db import DatabaseError
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST

from core import permissions as perms
from integrations.calendar import remove_entry, sync_entry
from teams.models import Game

from .forms import EventForm, ScheduleForm
from .models import Event, ScheduleEntry

User = get_user_model()


def _parse_date(value, default):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return default


# --- Calendar (UC-12, FREQ18, FREQ19, FREQ38, NFREQ8) -----------------------------------

@login_required
def calendar_view(request):
    today = timezone.localdate()
    start = _parse_date(request.GET.get("from"), today)
    days = 31
    end = start + timedelta(days=days - 1)
    game_id = request.GET.get("game") or ""
    try:
        events = perms.visible_events(request.user).filter(date__range=(start, end))
        schedules = perms.visible_schedules(request.user).filter(date__range=(start, end))
        if game_id.isdigit():
            events = events.filter(game_id=int(game_id))
            schedules = schedules.filter(game_id=int(game_id))
        items = sorted(list(events) + list(schedules), key=lambda i: (i.date, i.start_time))
        games = Game.objects.filter(id__in=perms.community_game_ids(request.user) | perms.managed_game_ids(request.user))
    except DatabaseError:
        return render(request, "core/error.html", {
            "title": "Calendar unavailable",
            "message": "We couldn't load events and schedules right now. Please try again later.",
        }, status=503)
    by_day = OrderedDict()
    for item in items:
        by_day.setdefault(item.date, []).append(item)
    return render(request, "scheduling/calendar.html", {
        "by_day": by_day,
        "start": start, "end": end,
        "prev": start - timedelta(days=days), "next": end + timedelta(days=1),
        "games": games, "game_id": game_id,
        "feed_url": request.build_absolute_uri(reverse("calendar_feed", args=[request.user.calendar_token])),
    })


def _ics_escape(text):
    return (text or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def calendar_feed(request, token):
    """Personal iCalendar feed for subscribing in external calendars (FREQ40, D8)."""
    user = User.objects.filter(calendar_token=token, status=User.Status.ACTIVE).first()
    if user is None:
        raise Http404
    since = timezone.localdate() - timedelta(days=30)
    stamp = timezone.now().strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Esports Hub//Calendar//EN",
             "CALSCALE:GREGORIAN", "X-WR-CALNAME:Esports Hub"]
    items = [("event", e) for e in perms.visible_events(user).filter(date__gte=since)]
    items += [("schedule", s) for s in perms.visible_schedules(user).filter(date__gte=since)]
    for kind, item in items:
        lines += [
            "BEGIN:VEVENT",
            f"UID:esportshub-{kind}-{item.pk}@esportshub",
            f"DTSTAMP:{stamp}",
            f"DTSTART:{datetime.combine(item.date, item.start_time):%Y%m%dT%H%M%S}",
            f"DTEND:{datetime.combine(item.date, item.end_time):%Y%m%dT%H%M%S}",
            f"SUMMARY:{_ics_escape(item.name)}",
            f"LOCATION:{_ics_escape(item.location)}",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return HttpResponse("\r\n".join(lines) + "\r\n", content_type="text/calendar; charset=utf-8")


# --- Event management (UC-4, FREQ11–FREQ15) -----------------------------------------------

def _require_event_manager(user):
    if not perms.can_manage_events(user):
        raise PermissionDenied("Only Game Managers and Administrators can manage events.")


@login_required
def manage_events(request):
    _require_event_manager(request.user)
    user = request.user
    events = Event.objects.select_related("game", "team")
    if not perms.is_admin(user):
        events = events.filter(game_id__in=perms.managed_game_ids(user))
    return render(request, "scheduling/manage_events.html", {"events": events})


@login_required
def event_form(request, pk=None):
    _require_event_manager(request.user)
    event = get_object_or_404(Event, pk=pk) if pk else None
    if event and not perms.can_manage_event(request.user, event):
        raise PermissionDenied("You can only manage events for your assigned games.")
    form = EventForm(request.POST or None, instance=event, user=request.user)
    if request.method == "POST" and form.is_valid():
        saved = form.save(commit=False)
        if event is None:
            saved.created_by = request.user
        saved.save()
        messages.success(request, f"Event {saved.name} {'updated' if event else 'created'}.")
        return redirect("manage_events")
    return render(request, "core/form_page.html", {
        "title": f"Edit {event.name}" if event else "Create event",
        "form": form, "submit_label": "Save event", "cancel_url": reverse("manage_events"),
    })


@login_required
def event_delete(request, pk):
    _require_event_manager(request.user)
    event = get_object_or_404(Event, pk=pk)
    if not perms.can_manage_event(request.user, event):
        raise PermissionDenied("You can only manage events for your assigned games.")
    if request.method == "POST":
        event.delete()
        messages.success(request, f"Event {event.name} deleted.")
        return redirect("manage_events")
    return render(request, "core/confirm.html", {
        "title": f"Delete {event.name}?", "message": "This event will be removed from every calendar.",
        "cancel_url": reverse("manage_events"),
    })


# --- Schedule management (UC-5, FREQ16–FREQ18, FREQ40) ----------------------------------------

def _require_schedule_manager(user):
    if not (perms.is_admin(user) or perms.is_game_manager(user)):
        raise PermissionDenied("Only Game Managers and Administrators can manage schedules.")


def _report_sync(request, entry, verb):
    ok, message = sync_entry(entry)
    if ok:
        messages.success(request, f"Schedule {entry.title} {verb}. {message}")
    else:
        messages.success(request, f"Schedule {entry.title} {verb}.")
        messages.error(request, f"{message} The schedule is saved; use “Retry sync” to try again.")


@login_required
def manage_schedules(request):
    _require_schedule_manager(request.user)
    entries = ScheduleEntry.objects.select_related("game", "team").filter(
        game_id__in=perms.managed_game_ids(request.user)
    )
    return render(request, "scheduling/manage_schedules.html", {"entries": entries})


@login_required
def schedule_form(request, pk=None):
    _require_schedule_manager(request.user)
    entry = get_object_or_404(ScheduleEntry, pk=pk) if pk else None
    if entry and not perms.can_manage_schedule(request.user, entry):
        raise PermissionDenied("You can only manage schedules for your assigned games.")
    form = ScheduleForm(request.POST or None, instance=entry, user=request.user)
    if request.method == "POST" and form.is_valid():
        saved = form.save(commit=False)
        if entry is None:
            saved.created_by = request.user
        saved.save()
        _report_sync(request, saved, "updated" if entry else "created")
        return redirect("manage_schedules")
    return render(request, "core/form_page.html", {
        "title": f"Edit {entry.title}" if entry else "Create game schedule",
        "form": form, "submit_label": "Save schedule", "cancel_url": reverse("manage_schedules"),
    })


@login_required
def schedule_delete(request, pk):
    _require_schedule_manager(request.user)
    entry = get_object_or_404(ScheduleEntry, pk=pk)
    if not perms.can_manage_schedule(request.user, entry):
        raise PermissionDenied("You can only manage schedules for your assigned games.")
    if request.method == "POST":
        ok, message = remove_entry(entry)
        entry.delete()
        messages.success(request, f"Schedule {entry.title} deleted.")
        if not ok:
            messages.error(request, message)
        return redirect("manage_schedules")
    return render(request, "core/confirm.html", {
        "title": f"Delete {entry.title}?", "message": "This schedule entry will be removed.",
        "cancel_url": reverse("manage_schedules"),
    })


@login_required
@require_POST
def schedule_resync(request, pk):
    entry = get_object_or_404(ScheduleEntry, pk=pk)
    if not perms.can_manage_schedule(request.user, entry):
        raise PermissionDenied("You can only manage schedules for your assigned games.")
    ok, message = sync_entry(entry)
    (messages.success if ok else messages.error)(request, message)
    return redirect("manage_schedules")
