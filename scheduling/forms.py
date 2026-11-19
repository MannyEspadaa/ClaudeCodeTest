from django import forms
from django.db.models import Q

from core import permissions as perms
from teams.models import Game, Team

from .models import Event, ScheduleEntry, Visibility

DATE = forms.DateInput(attrs={"type": "date"})
TIME = forms.TimeInput(attrs={"type": "time"}, format="%H:%M")


class _ScopedForm(forms.ModelForm):
    """Limits game/team choices to what the user manages (FREQ44, NFREQ4)."""

    def __init__(self, *args, user, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        games = Game.objects.filter(id__in=perms.managed_game_ids(user))
        self.fields["game"].queryset = games
        self.fields["team"].queryset = Team.objects.filter(game__in=games).select_related("game")
        self.fields["team"].required = False

    def _clean_common(self, cleaned):
        start, end = cleaned.get("start_time"), cleaned.get("end_time")
        if start and end and end <= start:
            self.add_error("end_time", "End time must be after the start time.")
        game, team = cleaned.get("game"), cleaned.get("team")
        if team and game and team.game_id != game.id:
            self.add_error("team", "That team does not belong to the selected game.")
        if team and not game:
            cleaned["game"] = game = team.game
        visibility = cleaned.get("visibility")
        if visibility == Visibility.TEAM and not team:
            self.add_error("team", "Choose a team for a team-only entry.")
        if visibility == Visibility.COMMUNITY and not game:
            self.add_error("game", "Choose a game for a community-only entry.")
        return cleaned


class EventForm(_ScopedForm):
    class Meta:
        model = Event
        fields = ("name", "date", "start_time", "end_time", "location", "description",
                  "game", "team", "visibility")
        widgets = {"date": DATE, "start_time": TIME, "end_time": TIME,
                   "description": forms.Textarea(attrs={"rows": 3})}

    def __init__(self, *args, user, **kwargs):
        super().__init__(*args, user=user, **kwargs)
        # Program-wide events (no game) are for Administrators only (D7).
        self.fields["game"].required = not perms.is_admin(user)
        self.fields["game"].empty_label = "Program-wide (no game)" if perms.is_admin(user) else "Choose a game"
        for name in ("name", "location"):
            self.fields[name].required = True

    def clean(self):
        cleaned = self._clean_common(super().clean())
        for name in ("name", "location"):
            value = cleaned.get(name)
            if value is not None and not value.strip():
                self.add_error(name, "This field is required.")
        return cleaned


def find_conflicts(entry):
    """Schedule entries that clash with `entry` (DECISIONS D7, TC-20)."""
    same_slot = ScheduleEntry.objects.filter(
        date=entry.date, start_time__lt=entry.end_time, end_time__gt=entry.start_time
    ).exclude(pk=entry.pk)
    clash = Q()
    if entry.team_id:
        clash |= Q(team_id=entry.team_id)
    else:
        clash |= Q(game_id=entry.game_id, team__isnull=True)
    if entry.location.strip():
        clash |= Q(location__iexact=entry.location.strip())
    return same_slot.filter(clash).select_related("game", "team")


class ScheduleForm(_ScopedForm):
    class Meta:
        model = ScheduleEntry
        fields = ("game", "team", "kind", "title", "opponent", "date", "start_time", "end_time",
                  "location", "visibility")
        widgets = {"date": DATE, "start_time": TIME, "end_time": TIME}
        help_texts = {"visibility": "Matches are usually visible to the game community; practices to the team."}

    def __init__(self, *args, user, **kwargs):
        super().__init__(*args, user=user, **kwargs)
        self.fields["visibility"].choices = [
            (Visibility.COMMUNITY, Visibility.COMMUNITY.label),
            (Visibility.TEAM, Visibility.TEAM.label),
            (Visibility.PUBLIC, Visibility.PUBLIC.label),
        ]

    def clean(self):
        cleaned = self._clean_common(super().clean())
        if self.errors:
            return cleaned
        probe = ScheduleEntry(
            pk=self.instance.pk, game=cleaned.get("game"), team=cleaned.get("team"),
            date=cleaned.get("date"), start_time=cleaned.get("start_time"),
            end_time=cleaned.get("end_time"), location=cleaned.get("location") or "",
        )
        if probe.game_id and probe.date and probe.start_time and probe.end_time:
            conflicts = list(find_conflicts(probe)[:5])
            if conflicts:
                details = "; ".join(
                    f"{c.title} ({c.team.name if c.team else c.game.name}, "
                    f"{c.start_time:%H:%M}–{c.end_time:%H:%M}{', ' + c.location if c.location else ''})"
                    for c in conflicts
                )
                raise forms.ValidationError(f"Scheduling conflict with: {details}.", code="conflict")
        return cleaned
