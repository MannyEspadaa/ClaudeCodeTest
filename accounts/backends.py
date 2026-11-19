from django.contrib.auth import get_user_model
from django.contrib.auth.backends import AllowAllUsersModelBackend


class UsernameOrEmailBackend(AllowAllUsersModelBackend):
    """Sign in with username or email.

    Inactive (suspended/removed) users are authenticated here so the login form
    can explain *why* they cannot sign in; the form then refuses them (D4).
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        User = get_user_model()
        lookup = {"email__iexact": username} if "@" in username else {"username__iexact": username}
        try:
            user = User.objects.get(**lookup)
        except User.DoesNotExist:
            User().set_password(password)  # equalise timing
            return None
        if user.check_password(password):
            return user
        return None

    def get_user(self, user_id):
        User = get_user_model()
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
