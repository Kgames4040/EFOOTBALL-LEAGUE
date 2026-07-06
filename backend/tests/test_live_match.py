"""Phase 3 live match backend tests"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dynamic-ratio-gen.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

FOUNDER = ("neco", "neco404")
ADMIN_USER = ("seed_Sahinler", "pass1234")
ADMIN_MATCH_ID = "6953d801-a87f-440c-9a7c-5c928d777be7"
FINISHED_MATCH_ID = "a9e766a1-4700-49d7-8fa2-e92fb0fd8d5f"


def login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p})
    assert r.status_code == 200, f"login failed: {r.text}"
    return r.json()["token"]


def H(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def founder_token():
    return login(*FOUNDER)


@pytest.fixture(scope="module")
def admin_token():
    return login(*ADMIN_USER)


def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200


def test_finished_match_detail(founder_token):
    r = requests.get(f"{API}/matches/{FINISHED_MATCH_ID}/detail", headers=H(founder_token))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "finished"
    assert d["home_score"] == 3 and d["away_score"] == 0
    assert d["can_manage"] is True
    assert "consts" in d and d["consts"]["half_real_sec"] == 300


def test_admin_assigned_match_detail(admin_token):
    r = requests.get(f"{API}/matches/{ADMIN_MATCH_ID}/detail", headers=H(admin_token))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["can_manage"] is True, "Admin should manage assigned match"


def test_admin_other_match_no_manage(admin_token, founder_token):
    # find another scheduled match different from assigned
    r = requests.get(f"{API}/matches", headers=H(founder_token))
    assert r.status_code == 200
    other = next((m for m in r.json() if m["id"] != ADMIN_MATCH_ID and m["id"] != FINISHED_MATCH_ID), None)
    assert other is not None
    r2 = requests.get(f"{API}/matches/{other['id']}/detail", headers=H(admin_token))
    assert r2.status_code == 200
    assert r2.json()["can_manage"] is False


def test_admin_cannot_control_other_match(admin_token, founder_token):
    r = requests.get(f"{API}/matches", headers=H(founder_token))
    other = next((m for m in r.json() if m["id"] != ADMIN_MATCH_ID and m["status"] == "scheduled"), None)
    assert other is not None
    r2 = requests.post(f"{API}/live/matches/{other['id']}/start-first-half", headers=H(admin_token))
    assert r2.status_code == 403


def test_full_live_flow_founder(founder_token):
    """Pick a scheduled match (not the admin's), run full flow"""
    r = requests.get(f"{API}/matches", headers=H(founder_token))
    assert r.status_code == 200
    matches = r.json()
    # pick a scheduled match not the admin assigned and not finished
    target = next((m for m in matches if m["status"] == "scheduled" and m["id"] != ADMIN_MATCH_ID), None)
    assert target is not None, "no scheduled match available"
    mid = target["id"]
    home_id = target["home_team_id"]
    away_id = target["away_team_id"]

    # start 1H
    r = requests.post(f"{API}/live/matches/{mid}/start-first-half", headers=H(founder_token))
    assert r.status_code == 200, r.text

    # goal home
    r = requests.post(f"{API}/live/matches/{mid}/goal", headers=H(founder_token), json={"team_id": home_id})
    assert r.status_code == 200
    assert r.json()["live_home"] == 1

    # correct goal -> move to away
    r = requests.post(f"{API}/live/matches/{mid}/correct-goal", headers=H(founder_token), json={"team_id": away_id})
    assert r.status_code == 200
    j = r.json()
    assert j["live_away"] == 1 and j["live_home"] == 0

    # end 1H
    r = requests.post(f"{API}/live/matches/{mid}/end-first-half", headers=H(founder_token))
    assert r.status_code == 200

    # detail status check
    r = requests.get(f"{API}/matches/{mid}/detail", headers=H(founder_token))
    assert r.json()["live_state"] == "halftime"

    # start 2H
    r = requests.post(f"{API}/live/matches/{mid}/start-second-half", headers=H(founder_token))
    assert r.status_code == 200

    # goal home -> 1-1
    r = requests.post(f"{API}/live/matches/{mid}/goal", headers=H(founder_token), json={"team_id": home_id})
    assert r.status_code == 200
    assert r.json()["live_home"] == 1

    # end match
    r = requests.post(f"{API}/live/matches/{mid}/end-match", headers=H(founder_token), json={})
    assert r.status_code == 200, r.text

    # verify persistence
    r = requests.get(f"{API}/matches/{mid}/detail", headers=H(founder_token))
    d = r.json()
    assert d["status"] == "finished"
    assert d["home_score"] == 1 and d["away_score"] == 1
    assert d["live_state"] == "finished"


def test_admin_can_control_assigned(admin_token, founder_token):
    """Admin should be able to start their assigned match"""
    # Check current state of assigned match
    r = requests.get(f"{API}/matches/{ADMIN_MATCH_ID}/detail", headers=H(admin_token))
    assert r.status_code == 200
    d = r.json()
    if d["status"] == "finished":
        pytest.skip("Assigned match already finished")
    if d["live_state"] in ("first_half", "second_half"):
        # already live - just check goal works
        r = requests.post(f"{API}/live/matches/{ADMIN_MATCH_ID}/goal",
                          headers=H(admin_token), json={"team_id": d["home"]["id"]})
        assert r.status_code == 200
        return
    # try starting
    r = requests.post(f"{API}/live/matches/{ADMIN_MATCH_ID}/start-first-half", headers=H(admin_token))
    assert r.status_code in (200, 400), r.text  # 400 if already started
