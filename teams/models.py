from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Game(models.Model):
    """A game and its community / roster (DECISIONS D3)."""

    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    description = models.TextField(blank=True)
    roster_capacity = models.PositiveIntegerField(
        null=True, blank=True, help_text="Maximum roster members. Leave blank for no limit."
    )
    join_requires_approval = models.BooleanField(
        default=False, help_text="Roster joins wait for Game Manager approval."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "game"
            slug, n = base, 2
            while Game.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        super().save(*args, **kwargs)

    def active_member_count(self):
        return self.memberships.filter(status=CommunityMembership.Status.ACTIVE).count()

    def is_full(self):
        return self.roster_capacity is not None and self.active_member_count() >= self.roster_capacity

    def __str__(self):
        return self.name


class GameManagerAssignment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gm_assignments")
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="manager_assignments")
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "game"], name="unique_gm_assignment")]

    def __str__(self):
        return f"{self.user} manages {self.game}"


class CommunityMembership(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending approval"
        ACTIVE = "active", "Active"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_memberships")
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="memberships")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["joined_at"]
        constraints = [models.UniqueConstraint(fields=["user", "game"], name="unique_community_membership")]

    def __str__(self):
        return f"{self.user} in {self.game} ({self.status})"


class Team(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="teams")
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["game__name", "name"]
        constraints = [models.UniqueConstraint(fields=["game", "name"], name="unique_team_name_per_game")]

    @property
    def is_shell(self):
        return not self.memberships.exists()

    def __str__(self):
        return f"{self.name} ({self.game.name})"


class TeamMembership(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_memberships")
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["user__username"]
        constraints = [models.UniqueConstraint(fields=["team", "user"], name="unique_team_membership")]

    def __str__(self):
        return f"{self.user} on {self.team}"
