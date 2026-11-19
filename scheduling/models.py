from django.conf import settings
from django.db import models


class Visibility(models.TextChoices):
    PUBLIC = "public", "Everyone signed in"
    COMMUNITY = "community", "Game community"
    TEAM = "team", "Team only"


class Event(models.Model):
    """Program event (FREQ11–FREQ15, FREQ19; DECISIONS D7)."""

    name = models.CharField(max_length=120)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    game = models.ForeignKey("teams.Game", null=True, blank=True, on_delete=models.CASCADE, related_name="events")
    team = models.ForeignKey("teams.Team", null=True, blank=True, on_delete=models.CASCADE, related_name="events")
    visibility = models.CharField(max_length=10, choices=Visibility.choices, default=Visibility.PUBLIC)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "start_time", "name"]

    kind_label = "Event"

    def __str__(self):
        return f"{self.name} on {self.date}"


class ScheduleEntry(models.Model):
    """Game schedule entry (FREQ16–FREQ18, FREQ38, FREQ40; DECISIONS D7/D8)."""

    class Kind(models.TextChoices):
        MATCH = "match", "Match"
        PRACTICE = "practice", "Practice"
        OTHER = "other", "Other"

    class SyncStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SYNCED = "synced", "Synced"
        FAILED = "failed", "Failed"

    game = models.ForeignKey("teams.Game", on_delete=models.CASCADE, related_name="schedule_entries")
    team = models.ForeignKey("teams.Team", null=True, blank=True, on_delete=models.CASCADE, related_name="schedule_entries")
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.MATCH)
    title = models.CharField(max_length=120)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=160, blank=True)
    opponent = models.CharField(max_length=120, blank=True)
    visibility = models.CharField(max_length=10, choices=Visibility.choices, default=Visibility.COMMUNITY)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sync_status = models.CharField(max_length=10, choices=SyncStatus.choices, default=SyncStatus.PENDING)
    sync_message = models.CharField(max_length=255, blank=True)
    external_id = models.CharField(max_length=128, blank=True)

    class Meta:
        ordering = ["date", "start_time", "title"]
        verbose_name_plural = "schedule entries"

    @property
    def kind_label(self):
        return self.get_kind_display()

    @property
    def name(self):
        return self.title

    def overlaps(self, other):
        return self.date == other.date and self.start_time < other.end_time and other.start_time < self.end_time

    def __str__(self):
        return f"{self.title} on {self.date}"
