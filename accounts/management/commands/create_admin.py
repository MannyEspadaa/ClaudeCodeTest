from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create (or promote) a verified Administrator account."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--email", required=True)
        parser.add_argument("--full-name", default="Administrator")
        parser.add_argument("--password", required=True)

    def handle(self, *args, **opts):
        User = get_user_model()
        user = User.objects.filter(username__iexact=opts["username"]).first()
        if user is None:
            if User.objects.filter(email__iexact=opts["email"]).exists():
                raise CommandError("That email is already used by another account.")
            user = User(username=opts["username"], email=opts["email"], full_name=opts["full_name"])
        user.set_password(opts["password"])
        user.email_verified = True
        user.is_administrator = True
        user.status = User.Status.ACTIVE
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Administrator {user.username} is ready."))
