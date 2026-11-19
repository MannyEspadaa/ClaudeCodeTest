"""Django settings for the Esports Hub (see docs/DECISIONS.md)."""
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default):
    value = os.environ.get(name)
    if not value:
        return list(default)
    return [item.strip().lower() for item in value.split(",") if item.strip()]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1", "[::1]"])

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "accounts",
    "teams",
    "scheduling",
    "analytics",
    "integrations",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "accounts.middleware.ActiveAccountMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "esportshub.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "core.context_processors.navigation",
            ],
        },
    },
]

WSGI_APPLICATION = "esportshub.wsgi.application"


def database_from_env():
    url = os.environ.get("DATABASE_URL")
    if url:
        parsed = urlparse(url)
        if parsed.scheme in {"postgres", "postgresql"}:
            return {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": parsed.path.lstrip("/"),
                "USER": unquote(parsed.username or ""),
                "PASSWORD": unquote(parsed.password or ""),
                "HOST": parsed.hostname or "",
                "PORT": str(parsed.port or ""),
                "CONN_MAX_AGE": 60,
            }
        if parsed.scheme == "sqlite":
            return sqlite_config(parsed.path)
        raise ValueError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")
    return sqlite_config(BASE_DIR / "db.sqlite3")


def sqlite_config(path):
    return {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": path,
        "OPTIONS": {
            # WAL + IMMEDIATE transactions let many readers work alongside a
            # writer and avoid "database is locked" upgrade deadlocks (NFREQ1).
            "init_command": "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;",
            "transaction_mode": "IMMEDIATE",
            "timeout": 30,
        },
    }


DATABASES = {"default": database_from_env()}

AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = ["accounts.backends.UsernameOrEmailBackend"]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LOGIN_URL = "login"
LOGIN_REDIRECT_URL = "dashboard"
LOGOUT_REDIRECT_URL = "landing"

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.environ.get("TIME_ZONE", "America/Chicago")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Email (FREQ4) -------------------------------------------------------
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "25"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", False)
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "esports-hub@localhost")

# --- Domain rules (D4) ---------------------------------------------------
OFFICIAL_EMAIL_DOMAINS = env_list("OFFICIAL_EMAIL_DOMAINS", ["school.edu"])
EMAIL_VERIFICATION_MAX_AGE = 60 * 60 * 48

# --- Integrations (D8) ---------------------------------------------------
CALENDAR_PROVIDER = os.environ.get(
    "CALENDAR_PROVIDER", "integrations.calendar.LocalCalendarProvider"
)
DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET", "")
DISCORD_PROVIDER = os.environ.get("DISCORD_PROVIDER", "")  # override class path

# --- Analytics (D9) ------------------------------------------------------
VOD_ALLOWED_HOSTS = [
    "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
    "twitch.tv", "www.twitch.tv", "vimeo.com", "www.vimeo.com",
]
STATS_UPLOAD_MAX_BYTES = 1024 * 1024

if not DEBUG:
    if SECRET_KEY == "dev-insecure-change-me":
        raise RuntimeError("Set DJANGO_SECRET_KEY when DJANGO_DEBUG is off.")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
    SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", "3600"))
    if env_bool("DJANGO_BEHIND_TLS_PROXY", False):
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
