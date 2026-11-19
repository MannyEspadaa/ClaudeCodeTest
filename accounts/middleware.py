from django.contrib import messages
from django.contrib.auth import logout
from django.shortcuts import redirect


class ActiveAccountMiddleware:
    """End sessions of suspended or removed accounts on their next request (FREQ36/37)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated and not user.is_account_active:
            logout(request)
            if hasattr(request, "_messages"):
                messages.error(request, "Your account is not active. Contact an administrator.")
            return redirect("login")
        return self.get_response(request)
