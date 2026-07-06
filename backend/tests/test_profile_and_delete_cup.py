"""Backend tests for the final-release bug fixes.

Covers:
- PUT /api/auth/me: username update (returns new token), password update,
  username < 3 chars rejected, username already taken rejected.
- DELETE /api/admin/tournament while in cup mode actually removes the
  tournament and its matches (the main 'delete cup' bug).
"""
import os
import uuid

import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    BASE = "http://localhost:8001"
API = f"{BASE}/api"

ADMIN_USER = "neco"
ADMIN_PASS = "neco404"


# -------- helpers --------
def _login(session, username, password):
    r = session.post(f"{API}/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, f"login {username} failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _register(session, username, password):
    r = session.post(f"{API}/auth/register", json={"username": username, "password": password})
    if r.status_code == 400 and "alınmış" in r.text:
        return _login(session, username, password)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _wipe(admin_token):
    s = requests.Session()
    s.headers.update(_auth(admin_token))
    s.delete(f"{API}/admin/tournament")
    for t in s.get(f"{API}/teams").json():
        s.delete(f"{API}/admin/teams/{t['id']}")
    for u in s.get(f"{API}/admin/users").json():
        if u.get("role") != "admin":
            s.delete(f"{API}/admin/users/{u['id']}")


@pytest.fixture(scope="session")
def admin_token():
    return _login(requests.Session(), ADMIN_USER, ADMIN_PASS)


@pytest.fixture()
def clean_env(admin_token):
    _wipe(admin_token)
    yield admin_token
    _wipe(admin_token)


# -------- PUT /api/auth/me --------

class TestProfileUpdate:
    def test_update_username_returns_new_token(self, clean_env):
        suffix = uuid.uuid4().hex[:6]
        uname = f"TEST_prof_{suffix}"
        s = requests.Session()
        _register(s, uname, "pass1234")
        # login
        tok = _login(s, uname, "pass1234")
        s.headers.update(_auth(tok))

        new_name = f"TEST_prof2_{suffix}"
        r = s.put(f"{API}/auth/me", json={"username": new_name})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 10
        assert data["user"]["username"] == new_name

        # GET /auth/me with new token returns updated username
        s2 = requests.Session()
        s2.headers.update(_auth(data["token"]))
        me = s2.get(f"{API}/auth/me").json()
        assert me["username"] == new_name

        # Old token may be invalid but the renamed user can login with original password
        r = requests.post(f"{API}/auth/login", json={"username": new_name, "password": "pass1234"})
        assert r.status_code == 200

    def test_update_password(self, clean_env):
        suffix = uuid.uuid4().hex[:6]
        uname = f"TEST_pw_{suffix}"
        s = requests.Session()
        tok = _register(s, uname, "pass1234")
        s.headers.update(_auth(tok))

        r = s.put(f"{API}/auth/me", json={"password": "newpass99"})
        assert r.status_code == 200, r.text

        # Old password fails
        r = requests.post(f"{API}/auth/login", json={"username": uname, "password": "pass1234"})
        assert r.status_code == 401
        # New password works
        r = requests.post(f"{API}/auth/login", json={"username": uname, "password": "newpass99"})
        assert r.status_code == 200

    def test_short_username_rejected(self, clean_env):
        suffix = uuid.uuid4().hex[:6]
        uname = f"TEST_short_{suffix}"
        s = requests.Session()
        tok = _register(s, uname, "pass1234")
        s.headers.update(_auth(tok))

        r = s.put(f"{API}/auth/me", json={"username": "ab"})
        assert r.status_code == 400
        assert "3 karakter" in r.text

    def test_duplicate_username_rejected(self, clean_env):
        suffix = uuid.uuid4().hex[:6]
        u1 = f"TEST_dup1_{suffix}"
        u2 = f"TEST_dup2_{suffix}"
        s1, s2 = requests.Session(), requests.Session()
        _register(s1, u1, "pass1234")
        tok2 = _register(s2, u2, "pass1234")
        s2.headers.update(_auth(tok2))

        # user2 tries to take user1's username
        r = s2.put(f"{API}/auth/me", json={"username": u1})
        assert r.status_code == 400
        assert "alınmış" in r.text


# -------- DELETE cup tournament (main bug) --------

class TestDeleteCupTournament:
    def test_delete_cup_in_running_mode(self, clean_env):
        admin_token = clean_env
        s = requests.Session()
        s.headers.update(_auth(admin_token))

        # 1. Create cup tournament
        r = s.post(f"{API}/admin/tournament", json={"name": "TEST Delete Cup", "mode": "cup", "weeks": 1})
        assert r.status_code == 200, r.text
        tour = r.json()
        assert tour["mode"] == "cup"
        assert tour["status"] == "running"
        tour_id = tour["id"]

        # Sanity: active tournament exists
        active = requests.get(f"{API}/tournament/active").json()
        assert active["id"] == tour_id

        # 2. Delete
        r = s.delete(f"{API}/admin/tournament")
        assert r.status_code == 200, r.text
        assert r.json() == {"deleted": True}

        # 3. No active tournament now
        r2 = requests.get(f"{API}/tournament/active")
        # active endpoint may 404 or return null
        if r2.status_code == 200:
            assert r2.json() in (None, {}) or r2.json().get("id") != tour_id
        else:
            assert r2.status_code in (404, 204)

    def test_delete_cup_with_matches_clears_matches(self, clean_env):
        """Create cup, register 4 users with teams, draw -> then delete and verify
        matches collection is cleaned for that tournament."""
        admin_token = clean_env
        s = requests.Session()
        s.headers.update(_auth(admin_token))

        # cup + 4 teams
        r = s.post(f"{API}/admin/tournament", json={"name": "TEST Cup Del2", "mode": "cup", "weeks": 1})
        assert r.status_code == 200
        tour_id = r.json()["id"]

        suffix = uuid.uuid4().hex[:6]
        for i in range(4):
            us = requests.Session()
            tok = _register(us, f"TEST_du_{suffix}_{i}", "pass1234")
            us.headers.update(_auth(tok))
            us.post(f"{API}/teams", json={"name": f"TEST_DTeam_{suffix}_{i}", "abbreviation": f"D{i}"})

        # Draw -> creates round 1 matches
        r = s.post(f"{API}/admin/cup/draw")
        assert r.status_code == 200
        bracket = requests.get(f"{API}/cup/bracket").json()
        # Confirm there are matches before deletion
        match_ids = [m["id"] for rnd in bracket["rounds"] for m in rnd["matches"]]
        assert len(match_ids) >= 2

        # Delete
        r = s.delete(f"{API}/admin/tournament")
        assert r.status_code == 200
        assert r.json()["deleted"] is True

        # Active gone
        r2 = requests.get(f"{API}/tournament/active")
        if r2.status_code == 200:
            body = r2.json()
            assert not body or body.get("id") != tour_id

        # Matches collection no longer has any of the cup matches
        all_matches = requests.get(f"{API}/matches").json()
        remaining = [m for m in all_matches if m["id"] in match_ids]
        assert remaining == [], f"matches not cleaned: {remaining}"

        # Bracket should be empty / 404-ish
        rb = requests.get(f"{API}/cup/bracket")
        if rb.status_code == 200:
            assert rb.json().get("rounds", []) == []


# -------- Full cup flow with start->result + draw+penalty + champion --------

def _start_and_finish(session, match_id, home_score, away_score, pen_winner_team_id=None):
    r = session.post(f"{API}/admin/cup/match/{match_id}/start")
    assert r.status_code == 200, f"start failed: {r.text}"
    payload = {"home_score": home_score, "away_score": away_score}
    if pen_winner_team_id is not None:
        payload["pen_winner_team_id"] = pen_winner_team_id
    return session.post(f"{API}/admin/cup/match/{match_id}/result", json=payload)


class TestFullCupFlow:
    def test_4_team_cup_to_champion_with_draw_penalty(self, clean_env):
        admin_token = clean_env
        s = requests.Session()
        s.headers.update(_auth(admin_token))

        # 1. Create cup
        r = s.post(f"{API}/admin/tournament", json={"name": "TEST Full Cup", "mode": "cup", "weeks": 1})
        assert r.status_code == 200

        # 2. Register 4 users + teams
        suffix = uuid.uuid4().hex[:6]
        team_ids = []
        for i in range(4):
            us = requests.Session()
            tok = _register(us, f"TEST_fc_{suffix}_{i}", "pass1234")
            us.headers.update(_auth(tok))
            tr = us.post(f"{API}/teams", json={"name": f"TEST_FCT_{suffix}_{i}", "abbreviation": f"F{i}"})
            assert tr.status_code == 200
            team_ids.append(tr.json()["id"])

        # 3. Draw round 1
        r = s.post(f"{API}/admin/cup/draw")
        assert r.status_code == 200
        assert r.json()["teams"] == 4

        bracket = requests.get(f"{API}/cup/bracket").json()
        round1 = bracket["rounds"][0]
        assert round1["label"] == "Yarı Final"
        assert len(round1["matches"]) == 2

        # 4. Drawn score without pen_winner -> 400
        m0 = round1["matches"][0]
        r = _start_and_finish(s, m0["id"], 1, 1)
        assert r.status_code == 400
        assert "penalt" in r.text.lower()

        # 5. Drawn with pen_winner -> winner = pen team
        away_id = m0["away"]["id"]
        # match is already started; just submit result with pen winner
        r = s.post(f"{API}/admin/cup/match/{m0['id']}/result",
                   json={"home_score": 1, "away_score": 1, "pen_winner_team_id": away_id})
        assert r.status_code == 200, r.text
        assert r.json()["winner_team_id"] == away_id

        # 6. Second SF: regular home win 3-0
        m1 = round1["matches"][1]
        r = _start_and_finish(s, m1["id"], 3, 0)
        assert r.status_code == 200, r.text
        sf2_winner = r.json()["winner_team_id"]

        # 7. Final round now exists
        bracket = requests.get(f"{API}/cup/bracket").json()
        assert len(bracket["rounds"]) == 2
        final_round = bracket["rounds"][1]
        assert final_round["label"] == "Final"
        assert len(final_round["matches"]) == 1
        final_match = final_round["matches"][0]
        finalists = {final_match["home"]["id"], final_match["away"]["id"]}
        assert finalists == {away_id, sf2_winner}

        # 8. Resolve final -> champion + tournament finished
        r = _start_and_finish(s, final_match["id"], 2, 0)
        assert r.status_code == 200, r.text
        champion_id = r.json()["winner_team_id"]

        active = requests.get(f"{API}/tournament/active").json()
        # active may be null if finished tournaments aren't returned; else status=finished
        if active and active.get("id"):
            assert active["status"] == "finished"
            assert active["champion_team_id"] == champion_id
        else:
            # confirm via summary
            summary = requests.get(f"{API}/cup/summary").json()
            assert summary["champion"]["id"] == champion_id
