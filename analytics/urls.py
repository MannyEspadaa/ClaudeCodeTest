from django.urls import path

from . import views

urlpatterns = [
    path("teams/<int:pk>/vods/", views.team_vods, name="team_vods"),
    path("teams/<int:pk>/stats/", views.team_stats, name="team_stats"),
    path("teams/<int:pk>/analytics/", views.manage_analytics, name="manage_analytics"),
    path("vods/<int:pk>/delete/", views.delete_vod, name="delete_vod"),
    path("uploads/<int:pk>/delete/", views.delete_upload, name="delete_upload"),
    path("comments/<int:pk>/delete/", views.delete_comment, name="delete_comment"),
]
