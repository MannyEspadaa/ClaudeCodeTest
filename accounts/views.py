import secrets

from django.contrib import messages
from django.contrib.auth import get_user_model, login
from django.contrib.auth import views as auth_views
from django.contrib.auth.decorators import login_required
from django.core import signing
from django.core.mail import send_mail
from django.db import DatabaseError
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from core import permissions as perms
from integrations.discord import DiscordAuthError, LocalDiscordProvider, get_discord_provider
from teams.models import CommunityMembership

from .forms import AccountForm, LoginForm, RegistrationForm, ResendVerificationForm
from .tokens import make_verification_token, read_verification_token

User = get_user_model()
BACKEND = "accounts.backends.UsernameOrEmailBackend"


# --- Registration and verification (UC-1, FREQ1, FREQ4, NFREQ7) --------------

def send_verification_email(request, user):
    link = request.build_absolute_uri(reverse("verify_email", args=[make_verification_token(user)]))
    send_mail(
        subject="Verify your Esports Hub account",
        message=(
            f"Hi {user.first_display_name},\n\n"
            f"Confirm your email address to finish creating your account:\n{link}\n\n"
            "This link expires in 48 hours."
        ),
        from_email=None,
        recipient_list=[user.email],
    )


def register(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    form = RegistrationForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.save(commit=False)
        user.full_name = form.cleaned_data["full_name"]
        user.email = form.cleaned_data["email"]
        user.save()
        send_verification_email(request, user)
        return render(request, "accounts/register_done.html", {"email": user.email})
    return render(request, "accounts/register.html", {"form": form})


def verify_email(request, token):
    try:
        uid, email = read_verification_token(token)
    except signing.SignatureExpired:
        messages.error(request, "That verification link has expired. Request a new one below.")
        return redirect("resend_verification")
    except signing.BadSignature:
        messages.error(request, "That verification link is not valid.")
        return redirect("resend_verification")
    user = User.objects.filter(pk=uid, email=email).first()
    if user is None or not user.is_account_active:
        messages.error(request, "That verification link is not valid.")
        return redirect("login")
    if not user.email_verified:
        user.email_verified = True
        user.save(update_fields=["email_verified"])
    login(request, user, backend=BACKEND)
    messages.success(request, "Your email is verified. Welcome to the Esports Hub!")
    return redirect("dashboard")


def resend_verification(request):
    form = ResendVerificationForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = User.objects.filter(email__iexact=form.cleaned_data["email"], email_verified=False).first()
        if user and user.is_account_active:
            send_verification_email(request, user)
        # Same response either way so the form does not reveal which emails exist.
        messages.info(request, "If that address has an unverified account, a new link is on its way.")
        return redirect("login")
    return render(request, "accounts/resend.html", {"form": form})


class HubLoginView(auth_views.LoginView):
    template_name = "accounts/login.html"
    authentication_form = LoginForm
    redirect_authenticated_user = True


# --- Profiles (UC-2, FREQ6–FREQ9) -----------------------------------------------

def _profile_failure(request):
    return render(
        request, "core/error.html",
        {"title": "Profile unavailable",
         "message": "We couldn't load this profile right now. Please try again later."},
        status=503,
    )


def _rosters(user):
    return list(
        CommunityMembership.objects.filter(user=user, status=CommunityMembership.Status.ACTIVE)
        .select_related("game").order_by("game__name")
    )


@login_required
def my_profile(request):
    try:
        user = User.objects.get(pk=request.user.pk)
        context = {
            "profile_user": user,
            "rosters": _rosters(user),
            "pending": list(user.community_memberships.filter(status=CommunityMembership.Status.PENDING)
                            .select_related("game")),
            "teams": list(user.team_memberships.select_related("team__game")),
            "managed_games": list(user.gm_assignments.select_related("game")),
            "roles": perms.role_labels(user),
            "own": True,
        }
    except DatabaseError:
        return _profile_failure(request)
    return render(request, "accounts/profile.html", context)


@login_required
def public_profile(request, username):
    if username.lower() == request.user.username.lower():
        return redirect("my_profile")
    try:
        user = get_object_or_404(User, username__iexact=username, status=User.Status.ACTIVE)
        teams = [m for m in user.team_memberships.select_related("team__game")
                 if perms.can_view_team(request.user, m.team)]
        context = {
            "profile_user": user,
            "rosters": _rosters(user),
            "teams": teams,
            "own": False,
        }
    except DatabaseError:
        return _profile_failure(request)
    return render(request, "accounts/profile.html", context)


@login_required
def edit_account(request):
    form = AccountForm(request.POST or None, instance=request.user)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Account updated.")
        return redirect("my_profile")
    return render(request, "core/form_page.html", {
        "title": "Edit account", "form": form, "submit_label": "Save",
        "cancel_url": reverse("my_profile"),
    })


# --- Discord (UC-11, FREQ42) -----------------------------------------------------

@login_required
def discord_connect(request):
    if request.method != "POST":
        return render(request, "accounts/discord.html")
    state = secrets.token_urlsafe(24)
    request.session["discord_oauth_state"] = state
    return redirect(get_discord_provider().authorize_url(request, state))


@login_required
def discord_local_authorize(request):
    """Local stand-in for Discord's consent screen (used when no Discord app is configured)."""
    state = request.GET.get("state") or request.POST.get("state", "")
    callback = reverse("discord_callback")
    if request.method == "POST":
        if "deny" in request.POST:
            return redirect(f"{callback}?error=access_denied&state={state}")
        username = request.POST.get("discord_username", "").strip()
        if not (2 <= len(username) <= 32):
            return render(request, "accounts/discord_local.html",
                          {"state": state, "error": "Enter a Discord username (2–32 characters)."})
        code = LocalDiscordProvider.make_code(username)
        return redirect(f"{callback}?code={code}&state={state}")
    return render(request, "accounts/discord_local.html", {"state": state})


@login_required
def discord_callback(request):
    expected = request.session.pop("discord_oauth_state", None)
    error = request.GET.get("error")
    code = request.GET.get("code")
    if error or not code or not expected or request.GET.get("state") != expected:
        messages.error(request, "Discord authentication failed. Your Discord account was not linked.")
        return redirect("discord_connect")
    try:
        discord_id, discord_username = get_discord_provider().exchange(request, code)
    except DiscordAuthError:
        messages.error(request, "Discord authentication failed. Your Discord account was not linked.")
        return redirect("discord_connect")
    user = request.user
    user.discord_id, user.discord_username = discord_id, discord_username
    user.save(update_fields=["discord_id", "discord_username"])
    messages.success(request, f"Discord account {discord_username} linked.")
    return redirect("my_profile")


@login_required
@require_POST
def discord_unlink(request):
    user = request.user
    user.discord_id = user.discord_username = ""
    user.save(update_fields=["discord_id", "discord_username"])
    messages.success(request, "Discord account unlinked.")
    return redirect("discord_connect")
