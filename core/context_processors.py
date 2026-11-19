from . import permissions as perms


def navigation(request):
    """Role-aware navigation flags for the desktop layout (NFREQ5)."""
    user = getattr(request, "user", None)
    if user is None or not user.is_authenticated or not user.is_account_active:
        return {"nav": None}
    is_admin = perms.is_admin(user)
    is_gm = perms.is_game_manager(user)
    return {"nav": {
        "is_admin": is_admin,
        "can_manage": is_admin or is_gm,
        "has_teams": is_admin or is_gm or bool(perms.player_team_ids(user)),
    }}
