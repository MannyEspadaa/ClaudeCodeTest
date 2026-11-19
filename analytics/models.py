from django.conf import settings
from django.db import models


class VOD(models.Model):
    """Video link for a team (FREQ29, FREQ45; DECISIONS D9)."""

    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="vods")
    title = models.CharField(max_length=140)
    url = models.URLField(max_length=500)
    played_on = models.DateField(null=True, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "VOD"

    def __str__(self):
        return self.title


class StatsUpload(models.Model):
    """One uploaded CSV of team match data (FREQ30)."""

    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="stats_uploads")
    original_filename = models.CharField(max_length=255)
    row_count = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.original_filename


class MatchRecord(models.Model):
    class Result(models.TextChoices):
        WIN = "W", "Win"
        LOSS = "L", "Loss"
        DRAW = "D", "Draw"

    upload = models.ForeignKey(StatsUpload, on_delete=models.CASCADE, related_name="records")
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="match_records")
    match_date = models.DateField()
    opponent = models.CharField(max_length=120)
    result = models.CharField(max_length=1, choices=Result.choices)
    score_for = models.PositiveIntegerField()
    score_against = models.PositiveIntegerField()

    class Meta:
        ordering = ["-match_date", "-id"]


class TeamStatistics(models.Model):
    """Stored, recalculated statistics for a team (FREQ43, FREQ46)."""

    team = models.OneToOneField("teams.Team", on_delete=models.CASCADE, related_name="statistics")
    matches_played = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    draws = models.PositiveIntegerField(default=0)
    win_rate = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    avg_score_for = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    avg_score_against = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    point_differential = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)


class ManagerComment(models.Model):
    """Game Manager comment for Players (FREQ31)."""

    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="manager_comments")
    upload = models.ForeignKey(StatsUpload, null=True, blank=True, on_delete=models.CASCADE, related_name="comments")
    vod = models.ForeignKey(VOD, null=True, blank=True, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
