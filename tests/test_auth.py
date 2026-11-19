"""UC-1 Create Account, UC-3 View Dashboard; FREQ1, FREQ4, FREQ10, NFREQ4, NFREQ7.

Covers TC-1, TC-2, TC-3, TC-4, TC-5, TC-9, TC-10 and login rules (DECISIONS D4).
"""
import re
import time

import pytest
from django.contrib.auth import get_user_model
from django.core import mail, signing
from django.urls import reverse

from accounts.forms import is_official_email
from accounts.tokens import SALT

from .conftest import PASSWORD

User = get_user_model()

REG = {
    "full_name": "Jordan Lee",
    "username": "jlee",
    "email": "jlee@school.edu",
    "password1": PASSWORD,
    "password2": PASSWORD,
}


def verification_link():
    body = mail.outbox[-1].body
    return re.search(r"https?://\S+/verify/(\S+)/", body).group(0)


@pytest.mark.django_db
def test_tc01_create_account_with_valid_official_email(client):
    """TC-1: account created, stored, verification email sent, verified after link."""
    response = client.post(reverse("register"), REG)
    assert response.status_code == 200
    assert b"Check your email" in response.content
    user = User.objects.get(username="jlee")
    assert user.full_name == "Jordan Lee"
    assert user.email == "jlee@school.edu"
    assert user.check_password(PASSWORD)
    assert user.password != PASSWORD  # stored hashed
    assert not user.email_verified
    assert len(mail.outbox) == 1 and mail.outbox[0].to == ["jlee@school.edu"]

    response = client.get(verification_link())
    assert response.status_code == 302 and response.url == reverse("dashboard")
    user.refresh_from_db()
    assert user.email_verified


@pytest.mark.django_db
@pytest.mark.parametrize("email", ["jlee@gmail.com", "jlee@school.edu.evil.com", "jlee@notschool.edu"])
def test_tc02_reject_non_official_email(client, email):
    """TC-2: non-official email rejected with validation error; no account."""
    response = client.post(reverse("register"), {**REG, "email": email})
    assert response.status_code == 200
    assert b"official email" in response.content
    assert not User.objects.exists()
    assert mail.outbox == []


def test_official_email_allows_subdomains():
    assert is_official_email("a@student.school.edu")
    assert not is_official_email("a@myschool.edu")


@pytest.mark.django_db
@pytest.mark.parametrize("blank", ["full_name", "username", "email", "password1", "password2"])
def test_tc03_reject_missing_required_fields(client, blank):
    """TC-3: each missing required field is reported; no account created."""
    response = client.post(reverse("register"), {**REG, blank: ""})
    assert response.status_code == 200
    assert b"This field is required" in response.content or b"Enter your full name" in response.content
    assert not User.objects.exists()


@pytest.mark.django_db
def test_tc04_reject_duplicate_email(client, make_user):
    """TC-4: email already in use (case-insensitive) is rejected; no duplicate."""
    make_user("existing", email="jlee@school.edu")
    response = client.post(reverse("register"), {**REG, "email": "JLee@School.edu"})
    assert b"already in use" in response.content
    assert User.objects.filter(email__iexact="jlee@school.edu").count() == 1


@pytest.mark.django_db
def test_duplicate_username_rejected(client, make_user):
    make_user("JLEE", email="other@school.edu")
    response = client.post(reverse("register"), REG)
    assert b"already taken" in response.content
    assert User.objects.count() == 1


@pytest.mark.django_db
def test_tc05_onboarding_completes_within_required_time(client):
    """TC-5 / NFREQ7: register → verify → dashboard in three steps and well under 5 minutes of system time."""
    started = time.perf_counter()
    steps = 0
    assert client.get(reverse("register")).status_code == 200; steps += 1
    client.post(reverse("register"), REG); steps += 1
    response = client.get(verification_link(), follow=True); steps += 1
    elapsed = time.perf_counter() - started
    assert response.redirect_chain[-1][0] == reverse("dashboard")
    assert b"Welcome, Jordan" in response.content
    assert steps == 3
    assert elapsed < 5  # system share of the 5-minute onboarding budget


@pytest.mark.django_db
def test_verification_link_expired_or_tampered(client, settings):
    client.post(reverse("register"), REG)
    user = User.objects.get()
    bad = client.get(reverse("verify_email", args=["not-a-token"]), follow=True)
    assert b"not valid" in bad.content
    settings.EMAIL_VERIFICATION_MAX_AGE = -1
    token = signing.dumps({"uid": user.pk, "email": user.email}, salt=SALT)
    expired = client.get(reverse("verify_email", args=[token]), follow=True)
    assert b"expired" in expired.content
    user.refresh_from_db()
    assert not user.email_verified


@pytest.mark.django_db
def test_unverified_user_cannot_sign_in(client, make_user):
    make_user("newbie", verified=False)
    response = client.post(reverse("login"), {"username": "newbie", "password": PASSWORD})
    assert b"Verify your email" in response.content
    assert "_auth_user_id" not in client.session


@pytest.mark.django_db
def test_resend_verification_sends_new_link(client, make_user):
    make_user("newbie", verified=False)
    client.post(reverse("resend_verification"), {"email": "newbie@school.edu"})
    assert len(mail.outbox) == 1


@pytest.mark.django_db
@pytest.mark.parametrize("identifier", ["member", "MEMBER", "member@school.edu"])
def test_sign_in_with_username_or_email(client, make_user, identifier):
    make_user("member")
    response = client.post(reverse("login"), {"username": identifier, "password": PASSWORD})
    assert response.status_code == 302 and response.url == reverse("dashboard")


@pytest.mark.django_db
def test_wrong_password_rejected(client, make_user):
    make_user("member")
    response = client.post(reverse("login"), {"username": "member", "password": "nope"})
    assert b"Incorrect username/email or password" in response.content


@pytest.mark.django_db
def test_tc09_view_dashboard_after_login(client, world):
    """TC-9: after login the user is redirected to the landing dashboard which shows their data."""
    response = client.post(reverse("login"), {"username": "player", "password": PASSWORD}, follow=True)
    assert response.redirect_chain[-1][0] == reverse("dashboard")
    content = response.content.decode()
    assert "Welcome, Pat" in content
    assert "Valorant Varsity" in content  # team with VOD/statistics links
    assert "Upcoming events" in content and "Upcoming schedule" in content
    # landing page also forwards signed-in users to the dashboard
    assert client.get(reverse("landing")).url == reverse("dashboard")


@pytest.mark.django_db
def test_tc10_prevent_dashboard_access_when_unauthenticated(client):
    """TC-10: anonymous users are sent to sign in."""
    response = client.get(reverse("dashboard"))
    assert response.status_code == 302
    assert response.url.startswith(reverse("login"))


@pytest.mark.django_db
def test_dashboard_load_failure_shows_error(client, world, login, monkeypatch):
    """UC-3 extension: dashboard data failure shows an error message."""
    from django.db import DatabaseError

    import core.views

    def boom(user):
        raise DatabaseError("down")

    monkeypatch.setattr(core.views, "_dashboard_context", boom)
    login(world["member"])
    response = client.get(reverse("dashboard"))
    assert response.status_code == 503
    assert b"Dashboard unavailable" in response.content


@pytest.mark.django_db
def test_logout(client, world, login):
    login(world["member"])
    response = client.post(reverse("logout"))
    assert response.status_code == 302
    assert client.get(reverse("dashboard")).status_code == 302
