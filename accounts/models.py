import secrets

from django.conf import settings
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.db.models.functions import Lower


def generate_calendar_token():
    return secrets.token_urlsafe(32)


class HubUserManager(UserManager):
    def get_by_natural_key(self, username):
        return self.get(username__iexact=username)


class User(AbstractUser):
    """Platform account. Roles are derived from scoped data (DECISIONS D2)."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        DEACTIVATED = "deactivated", "Removed"

    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    status_reason = models.CharField(max_length=255, blank=True)
    is_administrator = models.BooleanField(default=False)
    discord_id = models.CharField(max_length=64, blank=True)
    discord_username = models.CharField(max_length=64, blank=True)
    calendar_token = models.CharField(
        max_length=64, unique=True, default=generate_calendar_token, editable=False
    )

    objects = HubUserManager()

    class Meta:
        ordering = ["username"]
        constraints = [
            models.UniqueConstraint(Lower("username"), name="unique_username_ci"),
            models.UniqueConstraint(Lower("email"), name="unique_email_ci"),
        ]

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        self.is_active = self.status == self.Status.ACTIVE
        super().save(*args, **kwargs)

    @property
    def first_display_name(self):
        parts = (self.full_name or "").split()
        return parts[0] if parts else self.username

    @property
    def is_account_active(self):
        return self.status == self.Status.ACTIVE

    def __str__(self):
        return self.username


class AuditLog(models.Model):
    """Record of role changes and moderation actions (DECISIONS D10)."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    target = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="audit_entries"
    )
    action = models.CharField(max_length=64)
    detail = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.action} {self.target_id} by {self.actor_id}"


def audit(actor, target, action, detail=""):
    return AuditLog.objects.create(actor=actor, target=target, action=action, detail=detail[:255])
