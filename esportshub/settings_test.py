"""Test settings: fast hashing, local mail, deterministic providers."""
from .settings import *  # noqa: F401,F403
from .settings import BASE_DIR, DATABASES

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
OFFICIAL_EMAIL_DOMAINS = ["school.edu"]
CALENDAR_PROVIDER = "integrations.calendar.LocalCalendarProvider"
DISCORD_PROVIDER = "integrations.discord.LocalDiscordProvider"
DATABASES["default"]["NAME"] = BASE_DIR / "db.sqlite3"
# A file-backed test database lets the concurrency test (NFREQ1) use one
# connection per server thread, like a real deployment.
DATABASES["default"]["TEST"] = {"NAME": str(BASE_DIR / ".test_db.sqlite3")}
STORAGES = {
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
