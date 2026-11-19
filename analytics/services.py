"""CSV team-data parsing and statistics (FREQ30, FREQ43; DECISIONS D9)."""
import csv
import io
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction

from .models import MatchRecord, StatsUpload, TeamStatistics

REQUIRED_COLUMNS = ["match_date", "opponent", "result", "score_for", "score_against"]
RESULT_ALIASES = {"w": "W", "win": "W", "l": "L", "loss": "L", "d": "D", "draw": "D", "tie": "D"}
MAX_ROWS = 5000


class UploadError(Exception):
    def __init__(self, errors):
        super().__init__("; ".join(errors))
        self.errors = errors


def _parse_date(value):
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError


def parse_team_csv(uploaded_file):
    """Validate the whole file; return a list of row dicts or raise UploadError."""
    name = getattr(uploaded_file, "name", "") or ""
    if not name.lower().endswith(".csv"):
        raise UploadError(["Unsupported file type. Upload a .csv file."])
    if uploaded_file.size > settings.STATS_UPLOAD_MAX_BYTES:
        raise UploadError(["File is too large (maximum 1 MB)."])
    raw = uploaded_file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise UploadError(["File must be UTF-8 encoded CSV text."])
    if "\x00" in text:
        raise UploadError(["Unsupported file contents. Upload a plain-text CSV file."])
    reader = csv.DictReader(io.StringIO(text))
    headers = [h.strip().lower() for h in (reader.fieldnames or [])]
    missing = [c for c in REQUIRED_COLUMNS if c not in headers]
    if missing:
        raise UploadError([f"Missing required column(s): {', '.join(missing)}. "
                           f"Required: {', '.join(REQUIRED_COLUMNS)}."])
    reader.fieldnames = headers
    rows, errors = [], []
    for line, row in enumerate(reader, start=2):
        if len(rows) >= MAX_ROWS:
            errors.append(f"Too many rows (maximum {MAX_ROWS}).")
            break
        values = {k: (row.get(k) or "").strip() for k in REQUIRED_COLUMNS}
        if not any(values.values()):
            continue
        problems = []
        try:
            match_date = _parse_date(values["match_date"])
        except ValueError:
            problems.append("match_date must be YYYY-MM-DD")
        if not values["opponent"]:
            problems.append("opponent is required")
        result = RESULT_ALIASES.get(values["result"].lower())
        if result is None:
            problems.append("result must be W, L or D")
        scores = {}
        for key in ("score_for", "score_against"):
            try:
                scores[key] = int(values[key])
                if scores[key] < 0:
                    raise ValueError
            except ValueError:
                problems.append(f"{key} must be a whole number ≥ 0")
        if problems:
            errors.append(f"Row {line}: {', '.join(problems)}.")
            continue
        rows.append({"match_date": match_date, "opponent": values["opponent"][:120], "result": result, **scores})
    if errors:
        raise UploadError(errors[:20])
    if not rows:
        raise UploadError(["The file contains no match rows."])
    return rows


def _money(value, places="0.01"):
    return Decimal(value).quantize(Decimal(places), rounding=ROUND_HALF_UP)


def recalculate(team):
    """Calculate and store the team's statistics from all its match records."""
    records = list(MatchRecord.objects.filter(team=team).values("result", "score_for", "score_against"))
    played = len(records)
    wins = sum(r["result"] == "W" for r in records)
    losses = sum(r["result"] == "L" for r in records)
    draws = sum(r["result"] == "D" for r in records)
    total_for = sum(r["score_for"] for r in records)
    total_against = sum(r["score_against"] for r in records)
    stats, _ = TeamStatistics.objects.get_or_create(team=team)
    stats.matches_played, stats.wins, stats.losses, stats.draws = played, wins, losses, draws
    stats.win_rate = _money(Decimal(wins * 100) / played, "0.1") if played else Decimal("0")
    stats.avg_score_for = _money(Decimal(total_for) / played) if played else Decimal("0")
    stats.avg_score_against = _money(Decimal(total_against) / played) if played else Decimal("0")
    stats.point_differential = total_for - total_against
    stats.save()
    return stats


@transaction.atomic
def import_team_data(team, uploaded_file, user):
    rows = parse_team_csv(uploaded_file)
    upload = StatsUpload.objects.create(
        team=team, original_filename=uploaded_file.name[:255], row_count=len(rows), uploaded_by=user
    )
    MatchRecord.objects.bulk_create(MatchRecord(upload=upload, team=team, **row) for row in rows)
    recalculate(team)
    return upload


@transaction.atomic
def delete_upload(upload):
    team = upload.team
    upload.delete()
    recalculate(team)
