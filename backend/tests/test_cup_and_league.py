"""Backend tests for Cup (knockout) mode and League regression.

Covers:
- Cup tournament creation, draw, match result, advance, magazine, summary
- Edge cases: 2, 3, 4, 5, 8 teams; draws + penalty; editing guard; bye handling
- Cup reset
- League regression: random fixture, finish, standings
"""
import os
import time
import uuid

import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    BASE = "http://localhost:8001"
API = f"{BASE}/api"

ADMIN_USER = "neco"
ADMIN_PASS = "neco404"


# ---------- Helpers ----------

def _login(session, username, password):
    r = session.post(f"{API}/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, f"login {username} failed: {r.status_code} {r.text}"
    tok = r.json()["token"]
    return tok


def _register(session, username, password):
    r = session.post(f"{API}/auth/register", json={"username": username, "password": password})
    if r.status_code == 400 and "alınmış" in r.text:
        return _login(session, username, password)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _wipe_teams_and_tournaments(admin_token):
    """Delete all teams, all non-admin users and any active tournament so tests are isolated."""
    s = requests.Session()
    s.headers.update(_auth(admin_token))
    # Delete current active tournament (and its matches)
    s.delete(f"{API}/admin/tournament")
    # Delete all teams (cascades delete in admin endpoint also clears any matches)
    teams = s.get(f"{API}/teams").json()
    for t in teams:
        s.delete(f"{API}/admin/teams/{t['id']}")
    # Delete all non-admin users
    users = s.get(f"{API}/admin/users").json()
    for u in users:
        if u.get("role") != "admin":
            s.delete(f"{API}/admin/users/{u['id']}")


def _create_n_teams(admin_token, n):
    """Create n fresh user+team pairs. Returns list of team ids (in creation order)."""
    ids = []
    suffix = uuid.uuid4().hex[:6]
    for i in range(1, n + 1):
        uname = f"TEST_cup_{suffix}_u{i}"
        s = requests.Session()
        # register
        tok = _register(s, uname, "pass1234")
        s.headers.update(_auth(tok))
        # create team
        r = s.post(
            f"{API}/teams",
            json={
                "name": f"TEST_Team_{suffix}_{i}",
                "abbreviation": f"T{i:02d}",
            },
        )
        assert r.status_code == 200, f"team create failed: {r.status_code} {r.text}"
        ids.append(r.json()["id"])
    return ids


def _start_cup(admin_token, name="TEST Cup"):
    s = requests.Session()
    s.headers.update(_auth(admin_token))
    r = s.post(f"{API}/admin/tournament", json={"name": name, "mode": "cup", "weeks": 1})
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Fixtures ----------

@pytest.fixture(scope="session")
def admin_token():
    s = requests.Session()
    return _login(s, ADMIN_USER, ADMIN_PASS)


@pytest.fixture()
def clean_env(admin_token):
    _wipe_teams_and_tournaments(admin_token)
    yield admin_token
    _wipe_teams_and_tournaments(admin_token)


# ---------- 1. Tournament creation ----------

def test_create_cup_tournament(clean_env):
    admin_token = clean_env
    t = _start_cup(admin_token, "TEST Kupa 1")
    assert t["mode"] == "cup"
    assert t["status"] == "running"
    assert t["champion_team_id"] is None
    # GET /tournament/active reflects same
    r = requests.get(f"{API}/tournament/active")
    assert r.status_code == 200
    active = r.json()
    assert active["mode"] == "cup"
    assert active["status"] == "running"
    assert active["champion_team_id"] is None


# ---------- 2. Cup draw validations ----------

def test_cup_draw_requires_min_2_teams(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    # 0 teams
    r = s.post(f"{API}/admin/cup/draw")
    assert r.status_code == 400, r.text
    # 1 team
    _create_n_teams(admin_token, 1)
    r = s.post(f"{API}/admin/cup/draw")
    assert r.status_code == 400, r.text


def test_cup_draw_even_teams_no_bye(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    _create_n_teams(admin_token, 4)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    r = s.post(f"{API}/admin/cup/draw")
    assert r.status_code == 200
    assert r.json()["teams"] == 4
    bracket = requests.get(f"{API}/cup/bracket").json()
    assert len(bracket["rounds"]) == 1
    round1 = bracket["rounds"][0]
    assert round1["label"] == "Yarı Final"
    assert len(round1["matches"]) == 2
    for m in round1["matches"]:
        assert m["bye"] is False
        assert m["home"] is not None and m["away"] is not None


def test_cup_draw_odd_teams_creates_exactly_one_bye(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    _create_n_teams(admin_token, 5)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    r = s.post(f"{API}/admin/cup/draw")
    assert r.status_code == 200
    bracket = requests.get(f"{API}/cup/bracket").json()
    round1 = bracket["rounds"][0]
    # Quarter-final label since 5 <= 8
    assert round1["label"] == "Çeyrek Final"
    byes = [m for m in round1["matches"] if m["bye"]]
    assert len(byes) == 1
    bm = byes[0]
    assert bm["away"] is None
    assert bm["status"] == "finished"
    assert bm["winner_team_id"] == bm["home"]["id"]
    # Total matches = 3 (2 real + 1 bye)
    assert len(round1["matches"]) == 3


def test_cup_draw_two_teams_is_immediate_final(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    _create_n_teams(admin_token, 2)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    r = s.post(f"{API}/admin/cup/draw")
    assert r.status_code == 200
    bracket = requests.get(f"{API}/cup/bracket").json()
    assert len(bracket["rounds"]) == 1
    assert bracket["rounds"][0]["label"] == "Final"
    assert len(bracket["rounds"][0]["matches"]) == 1


# ---------- 3. Match result, draw + penalty winner ----------

def test_cup_result_higher_score_wins(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    _create_n_teams(admin_token, 2)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    s.post(f"{API}/admin/cup/draw")
    bracket = requests.get(f"{API}/cup/bracket").json()
    m = bracket["rounds"][0]["matches"][0]
    home_id, away_id = m["home"]["id"], m["away"]["id"]
    r = s.post(f"{API}/admin/cup/match/{m['id']}/result", json={"home_score": 2, "away_score": 1})
    assert r.status_code == 200
    assert r.json()["winner_team_id"] == home_id
    # Reverse case
    _wipe_teams_and_tournaments(admin_token)
    _start_cup(admin_token)
    _create_n_teams(admin_token, 2)
    s.post(f"{API}/admin/cup/draw")
    bracket = requests.get(f"{API}/cup/bracket").json()
    m = bracket["rounds"][0]["matches"][0]
    r = s.post(f"{API}/admin/cup/match/{m['id']}/result", json={"home_score": 0, "away_score": 3})
    assert r.json()["winner_team_id"] == m["away"]["id"]


def test_cup_draw_requires_penalty_winner(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    _create_n_teams(admin_token, 2)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    s.post(f"{API}/admin/cup/draw")
    m = requests.get(f"{API}/cup/bracket").json()["rounds"][0]["matches"][0]
    # No pen winner -> 400
    r = s.post(f"{API}/admin/cup/match/{m['id']}/result",
               json={"home_score": 1, "away_score": 1})
    assert r.status_code == 400
    assert "penalt" in r.text.lower()
    # Invalid pen winner (random uuid) -> 400
    r = s.post(f"{API}/admin/cup/match/{m['id']}/result",
               json={"home_score": 1, "away_score": 1, "pen_winner_team_id": "not-a-real-team"})
    assert r.status_code == 400
    # Valid pen winner -> the chosen team wins
    pen_winner = m["away"]["id"]
    r = s.post(f"{API}/admin/cup/match/{m['id']}/result",
               json={"home_score": 2, "away_score": 2, "pen_winner_team_id": pen_winner})
    assert r.status_code == 200
    assert r.json()["winner_team_id"] == pen_winner


# ---------- 4. Auto-advance, bracket progression, champion ----------

def _resolve_round(admin_token, round_idx, winner_pref="home"):
    """Finish every non-bye match in given round. Returns list of advancing team ids in slot order."""
    s = requests.Session(); s.headers.update(_auth(admin_token))
    bracket = requests.get(f"{API}/cup/bracket").json()
    rnd = bracket["rounds"][round_idx]
    winners = []
    for m in rnd["matches"]:
        if m["bye"]:
            winners.append(m["home"]["id"])
            continue
        # Home wins 2-1
        r = s.post(f"{API}/admin/cup/match/{m['id']}/result",
                   json={"home_score": 2, "away_score": 1})
        assert r.status_code == 200, r.text
        winners.append(r.json()["winner_team_id"])
    return winners


def test_full_cup_simulation_5_teams_to_champion(clean_env):
    admin_token = clean_env
    _start_cup(admin_token, "TEST 5 Cup")
    _create_n_teams(admin_token, 5)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    r = s.post(f"{API}/admin/cup/draw"); assert r.status_code == 200

    # Round 1 - QF
    b = requests.get(f"{API}/cup/bracket").json()
    assert b["rounds"][0]["label"] == "Çeyrek Final"
    _resolve_round(admin_token, 0)
    # After round 1 (3 winners) -> round 2 should now exist (3 winners -> 1 match + 1 bye)
    b = requests.get(f"{API}/cup/bracket").json()
    assert len(b["rounds"]) == 2
    assert b["rounds"][1]["label"] == "Yarı Final"
    sf_byes = [m for m in b["rounds"][1]["matches"] if m["bye"]]
    assert len(sf_byes) == 1  # odd count -> exactly 1 bye

    _resolve_round(admin_token, 1)
    b = requests.get(f"{API}/cup/bracket").json()
    assert len(b["rounds"]) == 3
    assert b["rounds"][2]["label"] == "Final"
    assert len(b["rounds"][2]["matches"]) == 1
    _resolve_round(admin_token, 2)

    # Tournament finished
    active = requests.get(f"{API}/tournament/active").json()
    assert active["status"] == "finished"
    assert active["champion_team_id"] is not None

    summary = requests.get(f"{API}/cup/summary").json()
    assert summary["champion"] is not None
    assert summary["champion"]["id"] == active["champion_team_id"]
    # top scorer present
    assert summary.get("top_scorer_team") is not None
    assert summary["top_scorer_team"]["goals"] >= 2


def test_full_cup_8_teams(clean_env):
    admin_token = clean_env
    _start_cup(admin_token, "TEST 8 Cup")
    _create_n_teams(admin_token, 8)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    s.post(f"{API}/admin/cup/draw")
    b = requests.get(f"{API}/cup/bracket").json()
    assert b["rounds"][0]["label"] == "Çeyrek Final"
    assert len(b["rounds"][0]["matches"]) == 4
    assert all(not m["bye"] for m in b["rounds"][0]["matches"])

    _resolve_round(admin_token, 0)
    b = requests.get(f"{API}/cup/bracket").json()
    assert b["rounds"][1]["label"] == "Yarı Final"
    assert len(b["rounds"][1]["matches"]) == 2
    _resolve_round(admin_token, 1)
    b = requests.get(f"{API}/cup/bracket").json()
    assert b["rounds"][2]["label"] == "Final"
    _resolve_round(admin_token, 2)
    active = requests.get(f"{API}/tournament/active").json()
    assert active["status"] == "finished"
    assert active["champion_team_id"] is not None


def test_full_cup_3_teams(clean_env):
    admin_token = clean_env
    _start_cup(admin_token, "TEST 3 Cup")
    _create_n_teams(admin_token, 3)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    s.post(f"{API}/admin/cup/draw")
    b = requests.get(f"{API}/cup/bracket").json()
    # 3 teams: round1 has 1 real match + 1 bye, label "Yarı Final"
    assert b["rounds"][0]["label"] == "Yarı Final"
    assert len([m for m in b["rounds"][0]["matches"] if m["bye"]]) == 1
    _resolve_round(admin_token, 0)
    b = requests.get(f"{API}/cup/bracket").json()
    assert b["rounds"][1]["label"] == "Final"
    _resolve_round(admin_token, 1)
    active = requests.get(f"{API}/tournament/active").json()
    assert active["status"] == "finished"


# ---------- 5. Magazine auto-publish ----------

def test_magazine_auto_published(clean_env):
    admin_token = clean_env
    _start_cup(admin_token, "TEST Mag Cup")
    _create_n_teams(admin_token, 4)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    s.post(f"{API}/admin/cup/draw")
    _resolve_round(admin_token, 0)
    time.sleep(0.3)
    mags = requests.get(f"{API}/magazine").json()
    titles = [m["title"] for m in mags]
    # Round 1 completed (non-final) -> "1. Tur Atlayanları"
    assert any("1. Tur Atlayanları" in t for t in titles), f"missing round-advance mag: {titles}"
    _resolve_round(admin_token, 1)  # final
    time.sleep(0.3)
    mags = requests.get(f"{API}/magazine").json()
    titles = [m["title"] for m in mags]
    assert any("Şampiyon" in t for t in titles), f"missing champion mag: {titles}"


# ---------- 6. /cup/summary top_scorer_team ----------

def test_cup_summary_top_scorer(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    _create_n_teams(admin_token, 4)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    s.post(f"{API}/admin/cup/draw")
    b = requests.get(f"{API}/cup/bracket").json()
    matches = b["rounds"][0]["matches"]
    # Force specific scores so we know who is top scorer
    # Match 0: home 5 - 0 away  (home scored 5)
    # Match 1: home 1 - 4 away  (away scored 4)
    r = s.post(f"{API}/admin/cup/match/{matches[0]['id']}/result", json={"home_score": 5, "away_score": 0})
    expected_top_id = matches[0]["home"]["id"]
    assert r.status_code == 200
    r = s.post(f"{API}/admin/cup/match/{matches[1]['id']}/result", json={"home_score": 1, "away_score": 4})
    assert r.status_code == 200

    summary = requests.get(f"{API}/cup/summary").json()
    assert summary["top_scorer_team"] is not None
    assert summary["top_scorer_team"]["id"] == expected_top_id
    assert summary["top_scorer_team"]["goals"] == 5


# ---------- 7. Editing guard ----------

def test_editing_guard_after_next_round_created(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    _create_n_teams(admin_token, 4)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    s.post(f"{API}/admin/cup/draw")
    _resolve_round(admin_token, 0)  # round 2 now exists
    # Pick first round1 match and try to edit
    b = requests.get(f"{API}/cup/bracket").json()
    r1 = b["rounds"][0]["matches"][0]
    r = s.post(f"{API}/admin/cup/match/{r1['id']}/result",
               json={"home_score": 7, "away_score": 0})
    assert r.status_code == 400
    assert "Sonraki tur" in r.text


def test_bye_match_cannot_be_edited(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    _create_n_teams(admin_token, 3)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    s.post(f"{API}/admin/cup/draw")
    b = requests.get(f"{API}/cup/bracket").json()
    bye = next(m for m in b["rounds"][0]["matches"] if m["bye"])
    r = s.post(f"{API}/admin/cup/match/{bye['id']}/result",
               json={"home_score": 3, "away_score": 0})
    assert r.status_code == 400
    assert "Bay" in r.text or "düzenlenemez" in r.text


# ---------- 8. Cup reset and redraw ----------

def test_cup_reset_and_redraw(clean_env):
    admin_token = clean_env
    _start_cup(admin_token)
    _create_n_teams(admin_token, 4)
    s = requests.Session(); s.headers.update(_auth(admin_token))
    s.post(f"{API}/admin/cup/draw")
    _resolve_round(admin_token, 0)
    # Tournament is mid-stage. Reset.
    r = s.post(f"{API}/admin/cup/reset")
    assert r.status_code == 200
    b = requests.get(f"{API}/cup/bracket").json()
    assert b["rounds"] == []
    active = requests.get(f"{API}/tournament/active").json()
    assert active["champion_team_id"] is None
    assert active["status"] == "running"
    # Draw again works
    r = s.post(f"{API}/admin/cup/draw")
    assert r.status_code == 200


# ---------- 9. League regression ----------

def test_league_regression(clean_env):
    admin_token = clean_env
    s = requests.Session(); s.headers.update(_auth(admin_token))
    # Start league tournament
    r = s.post(f"{API}/admin/tournament", json={"name": "TEST League", "mode": "league", "weeks": 1})
    assert r.status_code == 200
    assert r.json()["mode"] == "league"
    # Create 3 teams
    _create_n_teams(admin_token, 3)
    # Random fixture
    r = s.post(f"{API}/admin/fixture/random")
    assert r.status_code == 200
    created = r.json()["created"]
    # 3 teams double round robin: 3 matches per leg * 2 = 6 matches (one bye per round, so 1 match/round * 6 rounds=6). Actually round_robin pads to 4 -> 3 rounds * 2 = 6 fixture rounds, 1 match each => 6 docs.
    assert created >= 3
    # Get matches and finish them
    matches = requests.get(f"{API}/api/matches".replace("/api/api", "/api"))
    # use API path
    matches = requests.get(f"{API}/matches").json()
    assert len(matches) == created
    # Finish all matches with arbitrary scores
    for m in matches:
        r = s.post(f"{API}/admin/matches/{m['id']}/finish",
                   json={"home_score": 2, "away_score": 1})
        assert r.status_code == 200
    # Standings
    standings = requests.get(f"{API}/standings").json()
    assert isinstance(standings, list)
    assert len(standings) == 3
    # Each row has expected keys, points are integers
    for row in standings:
        assert {"team_id", "OM", "G", "B", "M", "AG", "YG", "A", "P", "rank"}.issubset(row.keys())
        assert isinstance(row["P"], int)
    # Total points across all teams: each finished match contributes 3 (no draws here)
    total_p = sum(r["P"] for r in standings)
    assert total_p == 3 * created
    # Ranks are 1..n
    assert sorted(r["rank"] for r in standings) == list(range(1, len(standings) + 1))
