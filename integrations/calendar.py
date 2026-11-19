"""Calendar service adapters (FREQ40, UC-5, TC-21; DECISIONS D8)."""
from django.conf import settings
from django.utils.module_loading import import_string


class CalendarSyncError(Exception):
    """The external calendar service failed or rejected the request."""


class BaseCalendarProvider:
    name = "calendar"

    def push(self, entry):
        """Create/update the entry externally; return its external id."""
        raise NotImplementedError

    def remove(self, entry):
        raise NotImplementedError


class LocalCalendarProvider(BaseCalendarProvider):
    """Credential-free provider: entries are published through the per-user
    iCalendar feed (/calendar/feed/<token>.ics), so the "sync" always succeeds."""

    name = "iCalendar feed"

    def push(self, entry):
        return f"esportshub-schedule-{entry.pk}"

    def remove(self, entry):
        return None


class UnavailableCalendarProvider(BaseCalendarProvider):
    """Simulates an external calendar outage (used by tests and demos)."""

    name = "external calendar"

    def push(self, entry):
        raise CalendarSyncError("The calendar service did not respond.")

    def remove(self, entry):
        raise CalendarSyncError("The calendar service did not respond.")


def get_calendar_provider():
    return import_string(settings.CALENDAR_PROVIDER)()


def sync_entry(entry):
    """Push one schedule entry; record and return (ok, message). Never raises."""
    from scheduling.models import ScheduleEntry

    provider = get_calendar_provider()
    try:
        external_id = provider.push(entry)
    except Exception as exc:  # any provider failure must be reported, not hidden
        message = f"Calendar update failed: {exc}"
        ScheduleEntry.objects.filter(pk=entry.pk).update(
            sync_status=ScheduleEntry.SyncStatus.FAILED, sync_message=message[:255]
        )
        entry.sync_status, entry.sync_message = ScheduleEntry.SyncStatus.FAILED, message[:255]
        return False, message
    message = f"Calendar updated ({provider.name})."
    ScheduleEntry.objects.filter(pk=entry.pk).update(
        sync_status=ScheduleEntry.SyncStatus.SYNCED, sync_message=message, external_id=external_id or ""
    )
    entry.sync_status, entry.sync_message = ScheduleEntry.SyncStatus.SYNCED, message
    return True, message


def remove_entry(entry):
    try:
        get_calendar_provider().remove(entry)
    except Exception as exc:
        return False, f"Calendar removal failed: {exc}"
    return True, ""
