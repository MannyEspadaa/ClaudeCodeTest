from django.urls import path

from . import views

urlpatterns = [
    path("calendar/", views.calendar_view, name="calendar"),
    path("calendar/feed/<str:token>.ics", views.calendar_feed, name="calendar_feed"),
    path("events/manage/", views.manage_events, name="manage_events"),
    path("events/new/", views.event_form, name="event_create"),
    path("events/<int:pk>/edit/", views.event_form, name="event_edit"),
    path("events/<int:pk>/delete/", views.event_delete, name="event_delete"),
    path("schedules/manage/", views.manage_schedules, name="manage_schedules"),
    path("schedules/new/", views.schedule_form, name="schedule_create"),
    path("schedules/<int:pk>/edit/", views.schedule_form, name="schedule_edit"),
    path("schedules/<int:pk>/delete/", views.schedule_delete, name="schedule_delete"),
    path("schedules/<int:pk>/resync/", views.schedule_resync, name="schedule_resync"),
]
