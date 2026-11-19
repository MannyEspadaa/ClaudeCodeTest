from django.urls import path

from . import views

urlpatterns = [
    path("games/", views.game_list, name="game_list"),
    path("games/<slug:slug>/", views.game_detail, name="game_detail"),
    path("games/<slug:slug>/join/", views.join_game, name="join_game"),
    path("games/<slug:slug>/leave/", views.leave_game, name="leave_game"),
    path("games/<slug:slug>/requests/<int:membership_id>/<str:decision>/",
         views.handle_request, name="roster_request"),
    path("games/<slug:slug>/teams/", views.manage_teams, name="manage_teams"),
    path("teams/", views.team_list, name="team_list"),
    path("teams/<int:pk>/", views.team_detail, name="team_detail"),
    path("teams/<int:pk>/edit/", views.edit_team, name="edit_team"),
    path("teams/<int:pk>/delete/", views.delete_team, name="delete_team"),
    path("teams/<int:pk>/members/add/", views.add_member, name="add_team_member"),
    path("teams/<int:pk>/members/<int:user_id>/remove/", views.remove_member, name="remove_team_member"),
]
