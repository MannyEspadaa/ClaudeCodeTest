from django.contrib.auth import views as auth_views
from django.urls import path

from . import manage_views, views

urlpatterns = [
    path("register/", views.register, name="register"),
    path("verify/resend/", views.resend_verification, name="resend_verification"),
    path("verify/<str:token>/", views.verify_email, name="verify_email"),
    path("login/", views.HubLoginView.as_view(), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("profile/", views.my_profile, name="my_profile"),
    path("profile/edit/", views.edit_account, name="edit_account"),
    path("users/<str:username>/", views.public_profile, name="public_profile"),
    path("discord/", views.discord_connect, name="discord_connect"),
    path("discord/authorize/", views.discord_local_authorize, name="discord_local_authorize"),
    path("discord/callback/", views.discord_callback, name="discord_callback"),
    path("discord/unlink/", views.discord_unlink, name="discord_unlink"),
    path("manage/users/", manage_views.user_list, name="manage_users"),
    path("manage/users/<int:pk>/", manage_views.user_detail, name="manage_user"),
    path("manage/users/<int:pk>/<str:action>/", manage_views.user_action, name="manage_user_action"),
    path("manage/audit/", manage_views.audit_log, name="audit_log"),
    path("manage/games/", manage_views.game_list, name="manage_games"),
    path("manage/games/new/", manage_views.game_edit, name="game_create"),
    path("manage/games/<int:pk>/edit/", manage_views.game_edit, name="game_edit"),
    path("manage/games/<int:pk>/delete/", manage_views.game_delete, name="game_delete"),
]
