from django import forms
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm

from teams.models import Game

User = get_user_model()


def is_official_email(email):
    """True if the email's domain is (a subdomain of) an official domain (FREQ1, D4)."""
    if not email or "@" not in email:
        return False
    domain = email.rsplit("@", 1)[1].strip().lower()
    return any(domain == d or domain.endswith("." + d) for d in settings.OFFICIAL_EMAIL_DOMAINS)


class RegistrationForm(UserCreationForm):
    full_name = forms.CharField(max_length=150, label="Full name")
    email = forms.EmailField(label="Official email address")

    class Meta:
        model = User
        fields = ("full_name", "username", "email")

    def clean_full_name(self):
        name = " ".join(self.cleaned_data["full_name"].split())
        if not name:
            raise forms.ValidationError("Enter your full name.")
        return name

    def clean_username(self):
        username = self.cleaned_data["username"].strip()
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("That username is already taken.")
        return username

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if not is_official_email(email):
            domains = ", ".join(settings.OFFICIAL_EMAIL_DOMAINS)
            raise forms.ValidationError(f"Use your official email address ({domains}).")
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("That email address is already in use. Use a different email.")
        return email


class LoginForm(AuthenticationForm):
    username = forms.CharField(label="Username or email", max_length=254)

    error_messages = {
        **AuthenticationForm.error_messages,
        "invalid_login": "Incorrect username/email or password.",
        "unverified": "Verify your email address before signing in. We can resend the link.",
        "suspended": "This account is suspended. Contact an administrator.",
        "deactivated": "This account has been removed.",
    }

    def confirm_login_allowed(self, user):
        if user.status == User.Status.SUSPENDED:
            raise forms.ValidationError(self.error_messages["suspended"], code="suspended")
        if user.status == User.Status.DEACTIVATED:
            raise forms.ValidationError(self.error_messages["deactivated"], code="deactivated")
        if not user.email_verified:
            raise forms.ValidationError(self.error_messages["unverified"], code="unverified")


class ResendVerificationForm(forms.Form):
    email = forms.EmailField()


class AccountForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("full_name",)


# --- Administrator forms (UC-9, UC-10) ---------------------------------------

class GrantGameManagerForm(forms.Form):
    game = forms.ModelChoiceField(queryset=Game.objects.all(), empty_label="Choose a game")


class ModerationForm(forms.Form):
    reason = forms.CharField(max_length=255, required=False, label="Reason (optional)")


class GameForm(forms.ModelForm):
    class Meta:
        model = Game
        fields = ("name", "description", "roster_capacity", "join_requires_approval")
        widgets = {"description": forms.Textarea(attrs={"rows": 3})}
