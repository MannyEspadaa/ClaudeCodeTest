"""UC-8 upload/analyse team data, UC-13 Player VODs and statistics.

FREQ29–FREQ31, FREQ43, FREQ45, FREQ46, NFREQ4.
Covers TC-33–TC-37, TC-50–TC-53.
"""
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from analytics.models import VOD, ManagerComment, MatchRecord, StatsUpload, TeamStatistics

CSV = (
    "match_date,opponent,result,score_for,score_against\n"
    "2026-10-01,State U,W,13,7\n"
    "2026-10-08,Tech,L,9,13\n"
    "2026-10-15,City College,W,13,11\n"
    "2026-10-22,Rivals,D,12,12\n"
)


def csv_file(text=CSV, name="week.csv"):
    return SimpleUploadedFile(name, text.encode(), content_type="text/csv")


def manage(client, team, action, **data):
    url = reverse("manage_analytics", args=[team.pk])
    payload = {"action": action}
    prefix = {"vod": "vod-", "data": "data-", "comment": "c-"}[action]
    payload.update({f"{prefix}{k}": v for k, v in data.items()})
    return client.post(url, payload, follow=True)


@pytest.mark.django_db
def test_tc33_upload_vod_for_managed_team(client, world, login):
    """TC-33: VOD stored and available to the team's players."""
    team = world["val_team"]
    login(world["gm"])
    response = manage(client, team, "vod", title="Finals vs State U",
                      url="https://www.youtube.com/watch?v=abc123", played_on="2026-10-01")
    assert b"VOD Finals vs State U added" in response.content
    vod = VOD.objects.get()
    assert vod.team == team and vod.uploaded_by == world["gm"]
    login(world["player"])
    content = client.get(reverse("team_vods", args=[team.pk])).content.decode()
    assert "Finals vs State U" in content and "https://www.youtube.com/watch?v=abc123" in content


@pytest.mark.django_db
def test_tc34_upload_team_data_and_calculate_statistics(client, world, login):
    """TC-34 / FREQ43: statistics calculated, stored and visible to players."""
    team = world["val_team"]
    login(world["gm"])
    response = manage(client, team, "data", file=csv_file())
    assert b"Imported 4 matches; statistics recalculated" in response.content
    stats = TeamStatistics.objects.get(team=team)
    assert (stats.matches_played, stats.wins, stats.losses, stats.draws) == (4, 2, 1, 1)
    assert stats.win_rate == Decimal("50.0")
    assert stats.avg_score_for == Decimal("11.75")
    assert stats.avg_score_against == Decimal("10.75")
    assert stats.point_differential == 4
    assert MatchRecord.objects.filter(team=team).count() == 4
    # a second upload accumulates
    manage(client, team, "data", file=csv_file("match_date,opponent,result,score_for,score_against\n"
                                               "2026-10-29,Tech,win,13,2\n", "rematch.csv"))
    stats.refresh_from_db()
    assert (stats.matches_played, stats.wins) == (5, 3)
    login(world["player"])
    content = client.get(reverse("team_stats", args=[team.pk])).content.decode()
    assert "60.0%" in content and "3–1–1" in content and "City College" in content


@pytest.mark.django_db
def test_removing_upload_recalculates(client, world, login):
    team = world["val_team"]
    login(world["gm"])
    manage(client, team, "data", file=csv_file())
    upload = StatsUpload.objects.get()
    client.post(reverse("delete_upload", args=[upload.pk]))
    assert TeamStatistics.objects.get(team=team).matches_played == 0


@pytest.mark.django_db
def test_tc35_comment_on_uploaded_team_data(client, world, login):
    """TC-35: GM comment stored and visible to players."""
    team = world["val_team"]
    login(world["gm"])
    manage(client, team, "data", file=csv_file())
    upload = StatsUpload.objects.get()
    response = manage(client, team, "comment", body="Watch your eco rounds.", upload=upload.pk)
    assert b"Comment posted" in response.content
    comment = ManagerComment.objects.get()
    assert comment.upload == upload and comment.author == world["gm"]
    login(world["player"])
    assert "Watch your eco rounds." in client.get(reverse("team_stats", args=[team.pk])).content.decode()


@pytest.mark.django_db
def test_comment_on_vod_visible_on_vod_page(client, world, login):
    team = world["val_team"]
    login(world["gm"])
    manage(client, team, "vod", title="Scrim", url="https://youtu.be/xyz")
    manage(client, team, "comment", body="Great comms at 12:30", vod=VOD.objects.get().pk)
    login(world["player"])
    assert "Great comms at 12:30" in client.get(reverse("team_vods", args=[team.pk])).content.decode()


@pytest.mark.django_db
def test_players_cannot_post_or_delete_comments(client, world, login):
    team = world["val_team"]
    comment = ManagerComment.objects.create(team=team, author=world["gm"], body="Note")
    login(world["player"])
    assert manage(client, team, "comment", body="sneaky").status_code == 403
    assert client.post(reverse("delete_comment", args=[comment.pk])).status_code == 403
    assert ManagerComment.objects.count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize("url", [
    "http://www.youtube.com/watch?v=abc",       # not https
    "https://example.com/video.mp4",            # unsupported host
    "https://youtube.com.evil.example/watch",   # look-alike host
    "not a url",
])
def test_tc36_reject_unsupported_vod(client, world, login, url):
    """TC-36: unsupported VOD links are rejected and nothing stored."""
    login(world["gm"])
    response = manage(client, world["val_team"], "vod", title="Bad", url=url)
    assert b"Upload error" in response.content
    assert not VOD.objects.exists()


@pytest.mark.django_db
@pytest.mark.parametrize("name,text,error", [
    ("stats.xlsx", CSV, b"Unsupported file type"),
    ("stats.csv", "opponent,result\nTech,W\n", b"Missing required column"),
    ("stats.csv", "match_date,opponent,result,score_for,score_against\n2026-13-45,Tech,W,1,2\n", b"match_date must be"),
    ("stats.csv", "match_date,opponent,result,score_for,score_against\n2026-10-01,Tech,Maybe,1,2\n", b"result must be W, L or D"),
    ("stats.csv", "match_date,opponent,result,score_for,score_against\n2026-10-01,Tech,W,-1,2\n", b"score_for must be"),
    ("stats.csv", "match_date,opponent,result,score_for,score_against\n", b"no match rows"),
])
def test_tc36_reject_invalid_team_data(client, world, login, name, text, error):
    """TC-36: invalid data files are rejected whole; nothing stored."""
    login(world["gm"])
    response = manage(client, world["val_team"], "data", file=csv_file(text, name))
    assert b"Upload error" in response.content
    assert error in response.content
    assert not StatsUpload.objects.exists() and not MatchRecord.objects.exists()


@pytest.mark.django_db
def test_tc36_partial_bad_rows_store_nothing(client, world, login):
    bad = CSV + "2026-11-01,Tech,W,abc,3\n"
    login(world["gm"])
    response = manage(client, world["val_team"], "data", file=csv_file(bad))
    assert b"Row 6" in response.content
    assert not MatchRecord.objects.exists()


@pytest.mark.django_db
def test_tc36_reject_binary_and_oversize(client, world, login, settings):
    login(world["gm"])
    binary = SimpleUploadedFile("x.csv", b"\x89PNG\r\n\x1a\n\x00\x00", content_type="text/csv")
    assert b"Upload error" in manage(client, world["val_team"], "data", file=binary).content
    settings.STATS_UPLOAD_MAX_BYTES = 10
    assert b"too large" in manage(client, world["val_team"], "data", file=csv_file()).content
    assert not StatsUpload.objects.exists()


@pytest.mark.django_db
def test_tc37_prevent_uploads_for_unassigned_team(client, world, login):
    """TC-37: a GM cannot access analytics, upload, or comment for another game's team."""
    rl_team = world["rl_team"]
    login(world["gm"])  # manages Valorant only
    assert client.get(reverse("manage_analytics", args=[rl_team.pk])).status_code == 403
    assert manage(client, rl_team, "vod", title="x", url="https://youtu.be/x").status_code == 403
    assert manage(client, rl_team, "data", file=csv_file()).status_code == 403
    assert manage(client, rl_team, "comment", body="hi").status_code == 403
    assert not VOD.objects.exists() and not StatsUpload.objects.exists() and not ManagerComment.objects.exists()
    vod = VOD.objects.create(team=rl_team, title="RL", url="https://youtu.be/rl")
    assert client.post(reverse("delete_vod", args=[vod.pk])).status_code == 403


@pytest.mark.django_db
def test_tc50_view_team_vods_as_player(client, world, login):
    """TC-50: players see VODs uploaded for their team."""
    team = world["val_team"]
    VOD.objects.create(team=team, title="Week 1 Review", url="https://www.twitch.tv/videos/1")
    login(world["player"])
    response = client.get(reverse("team_vods", args=[team.pk]))
    assert response.status_code == 200 and b"Week 1 Review" in response.content


@pytest.mark.django_db
def test_tc51_view_team_statistics_as_player(client, world, login):
    """TC-51: players see their team's statistics."""
    team = world["val_team"]
    TeamStatistics.objects.create(team=team, matches_played=10, wins=7, losses=3, win_rate=Decimal("70.0"))
    login(world["player"])
    content = client.get(reverse("team_stats", args=[team.pk])).content.decode()
    assert "70.0%" in content and "7–3–0" in content


@pytest.mark.django_db
def test_tc52_prevent_player_viewing_other_team_data(client, world, login):
    """TC-52: players cannot see another team's VODs or statistics."""
    rl_team = world["rl_team"]
    VOD.objects.create(team=rl_team, title="RL Secret VOD", url="https://youtu.be/s")
    TeamStatistics.objects.create(team=rl_team, matches_played=3, wins=3)
    login(world["player"])
    for name in ["team_vods", "team_stats"]:
        response = client.get(reverse(name, args=[rl_team.pk]))
        assert response.status_code == 403
        assert b"RL Secret VOD" not in response.content
    # community members (non-players) are refused too
    login(world["member"])
    assert client.get(reverse("team_vods", args=[world["val_team"].pk])).status_code == 403


@pytest.mark.django_db
def test_tc53_no_vods_message(client, world, login):
    """TC-53: empty team shows a no-VODs message."""
    login(world["player"])
    response = client.get(reverse("team_vods", args=[world["val_team"].pk]))
    assert b"No VODs available for this team yet" in response.content
    assert b"No statistics available" in client.get(reverse("team_stats", args=[world["val_team"].pk])).content
