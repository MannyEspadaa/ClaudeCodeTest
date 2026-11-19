from django.urls import include, path

urlpatterns = [
    path("", include("core.urls")),
    path("", include("accounts.urls")),
    path("", include("teams.urls")),
    path("", include("scheduling.urls")),
    path("", include("analytics.urls")),
]

handler403 = "core.views.permission_denied"
handler404 = "core.views.not_found"
