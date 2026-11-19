"""Discord account linking (FREQ42, UC-11; DECISIONS D8).

OAuth2 authorization-code flow. With DISCORD_CLIENT_ID/SECRET configured the
real Discord API is used; otherwise a local authorization page stands in.
"""
import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.core import signing
from django.urls import reverse
from django.utils.module_loading import import_string

LOCAL_CODE_SALT = "integrations.discord.local-code"


class DiscordAuthError(Exception):
    pass


class BaseDiscordProvider:
    def authorize_url(self, request, state):
        raise NotImplementedError

    def exchange(self, request, code):
        """Return (discord_id, discord_username) or raise DiscordAuthError."""
        raise NotImplementedError


class DiscordOAuthProvider(BaseDiscordProvider):
    AUTHORIZE = "https://discord.com/oauth2/authorize"
    TOKEN = "https://discord.com/api/oauth2/token"
    ME = "https://discord.com/api/users/@me"

    def _redirect_uri(self, request):
        return request.build_absolute_uri(reverse("discord_callback"))

    def authorize_url(self, request, state):
        query = urllib.parse.urlencode({
            "client_id": settings.DISCORD_CLIENT_ID,
            "redirect_uri": self._redirect_uri(request),
            "response_type": "code",
            "scope": "identify",
            "state": state,
            "prompt": "consent",
        })
        return f"{self.AUTHORIZE}?{query}"

    def exchange(self, request, code):
        body = urllib.parse.urlencode({
            "client_id": settings.DISCORD_CLIENT_ID,
            "client_secret": settings.DISCORD_CLIENT_SECRET,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self._redirect_uri(request),
        }).encode()
        try:
            token_req = urllib.request.Request(
                self.TOKEN, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            with urllib.request.urlopen(token_req, timeout=10) as resp:
                token = json.load(resp)["access_token"]
            me_req = urllib.request.Request(self.ME, headers={"Authorization": f"Bearer {token}"})
            with urllib.request.urlopen(me_req, timeout=10) as resp:
                me = json.load(resp)
        except (urllib.error.URLError, KeyError, ValueError, TimeoutError) as exc:
            raise DiscordAuthError("Discord rejected the authorization.") from exc
        return str(me["id"]), me.get("global_name") or me["username"]


class LocalDiscordProvider(BaseDiscordProvider):
    """Credential-free stand-in for Discord's consent screen."""

    def authorize_url(self, request, state):
        return f"{reverse('discord_local_authorize')}?{urllib.parse.urlencode({'state': state})}"

    @staticmethod
    def make_code(username):
        return signing.dumps({"u": username}, salt=LOCAL_CODE_SALT)

    def exchange(self, request, code):
        try:
            data = signing.loads(code, salt=LOCAL_CODE_SALT, max_age=600)
        except signing.BadSignature as exc:
            raise DiscordAuthError("Discord rejected the authorization.") from exc
        username = data["u"]
        return f"local-{username.lower()}", username


def get_discord_provider():
    if settings.DISCORD_PROVIDER:
        return import_string(settings.DISCORD_PROVIDER)()
    if settings.DISCORD_CLIENT_ID and settings.DISCORD_CLIENT_SECRET:
        return DiscordOAuthProvider()
    return LocalDiscordProvider()
