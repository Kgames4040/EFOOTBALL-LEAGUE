#!/usr/bin/env python3
"""
Backend test for 2026-07 session features:
1. GET /api/keepalive (no auth, DB ping)
2. PUT /api/admin/tournament (founder edits name & cover)
3. GET /api/magazine/{id} (public single item fetch)
4. GET /api/mention-targets (extended with section mentions)
5. POST /api/admin/matches/{id}/magazine (with mentions support)
"""
import requests
import json
import uuid

# Backend URL from frontend/.env
BASE_URL = "https://f64ebd19-4f62-41c6-80c2-5571e510b84a.preview.emergentagent.com/api"

# Founder credentials from /app/memory/test_credentials.md
FOUNDER_USERNAME = "neco"
FOUNDER_PASSWORD = "neco404"

founder_token = None


def log(msg):
    print(f"[TEST] {msg}")


def login_founder():
    global founder_token
    log("Logging in as founder...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": FOUNDER_USERNAME,
        "password": FOUNDER_PASSWORD
    })
    assert resp.status_code == 200, f"Founder login failed: {resp.status_code} {resp.text}"
    data = resp.json()
    founder_token = data["token"]
    log(f"✓ Founder logged in")
    return founder_token


def test_keepalive():
    """Test 1: GET /api/keepalive (no auth required)"""
    log("\n" + "="*60)
    log("TEST 1: GET /api/keepalive")
    log("="*60)
    
    log("Testing keepalive endpoint (no auth)...")
    resp = requests.get(f"{BASE_URL}/keepalive")
    
    assert resp.status_code == 200, f"Keepalive failed: {resp.status_code} {resp.text}"
    
    data = resp.json()
    log(f"Response: {json.dumps(data, indent=2)}")
    
    # Verify response structure
    assert "status" in data, "Response missing 'status' field"
    assert data["status"] == "alive", f"Status should be 'alive', got {data['status']}"
    
    assert "db" in data, "Response missing 'db' field"
    assert isinstance(data["db"], bool), f"'db' should be boolean, got {type(data['db'])}"
    assert data["db"] == True, f"DB should be True (connected), got {data['db']}"
    
    assert "time" in data, "Response missing 'time' field"
    assert isinstance(data["time"], str), f"'time' should be string (ISO timestamp), got {type(data['time'])}"
    # Verify it's a valid ISO timestamp
    from datetime import datetime
    try:
        datetime.fromisoformat(data["time"].replace('Z', '+00:00'))
        log(f"✓ Valid ISO timestamp: {data['time']}")
    except ValueError:
        raise AssertionError(f"Invalid ISO timestamp: {data['time']}")
    
    log("✓ Response has correct structure: status='alive', db=true, time=ISO timestamp")
    log("✅ TEST 1 PASSED: GET /api/keepalive")


def test_put_tournament():
    """Test 2: PUT /api/admin/tournament (founder edits name & cover)"""
    log("\n" + "="*60)
    log("TEST 2: PUT /api/admin/tournament")
    log("="*60)
    
    # First, check if there's an active tournament
    log("Checking for active tournament...")
    resp = requests.get(f"{BASE_URL}/tournament/active")
    
    if resp.status_code == 404:
        log("No active tournament found, creating one...")
        # Create a league tournament
        resp_create = requests.post(f"{BASE_URL}/admin/tournament",
            headers={"Authorization": f"Bearer {founder_token}"},
            json={
                "name": "Test Ligi",
                "weeks": 2,
                "mode": "league",
                "cover_url": ""
            })
        assert resp_create.status_code == 200, f"Tournament creation failed: {resp_create.status_code} {resp_create.text}"
        log("✓ Test tournament created")
        
        # Get the active tournament again
        resp = requests.get(f"{BASE_URL}/tournament/active")
    
    assert resp.status_code == 200, f"Get active tournament failed: {resp.status_code} {resp.text}"
    original_tournament = resp.json()
    log(f"Active tournament: {original_tournament['name']}")
    
    # Test 2a: Update tournament name and cover
    log("\n--- Test 2a: Update name and cover ---")
    new_name = "Yeni İsim"
    new_cover = "https://example.com/x.jpg"
    
    resp = requests.put(f"{BASE_URL}/admin/tournament",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "name": new_name,
            "cover_url": new_cover
        })
    
    assert resp.status_code == 200, f"PUT tournament failed: {resp.status_code} {resp.text}"
    updated = resp.json()
    
    assert updated["name"] == new_name, f"Name not updated: expected '{new_name}', got '{updated['name']}'"
    assert updated["cover_url"] == new_cover, f"Cover URL not updated: expected '{new_cover}', got '{updated['cover_url']}'"
    
    log(f"✓ Tournament updated: name='{updated['name']}', cover_url='{updated['cover_url']}'")
    
    # Verify via GET /api/tournament/active
    resp_verify = requests.get(f"{BASE_URL}/tournament/active")
    assert resp_verify.status_code == 200, "Failed to get active tournament after update"
    verified = resp_verify.json()
    
    assert verified["name"] == new_name, f"GET active tournament shows old name: {verified['name']}"
    assert verified["cover_url"] == new_cover, f"GET active tournament shows old cover: {verified['cover_url']}"
    
    log(f"✓ Verified via GET /api/tournament/active: name and cover updated")
    
    # Test 2b: Empty name should return 400
    log("\n--- Test 2b: Empty name should return 400 ---")
    resp_empty = requests.put(f"{BASE_URL}/admin/tournament",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={"name": ""})
    
    assert resp_empty.status_code == 400, f"Empty name should return 400, got {resp_empty.status_code}"
    log(f"✓ Empty name rejected with 400: {resp_empty.json()}")
    
    # Test 2c: Non-founder user should return 403
    log("\n--- Test 2c: Non-founder user should return 403 ---")
    # Try without token
    resp_no_auth = requests.put(f"{BASE_URL}/admin/tournament",
        json={"name": "Hacker"})
    
    assert resp_no_auth.status_code in [401, 403], f"No auth should return 401/403, got {resp_no_auth.status_code}"
    log(f"✓ No auth rejected with {resp_no_auth.status_code}")
    
    # Restore original tournament name
    log("\n--- Restoring original tournament name ---")
    resp_restore = requests.put(f"{BASE_URL}/admin/tournament",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={"name": original_tournament["name"]})
    assert resp_restore.status_code == 200, "Failed to restore original tournament name"
    log(f"✓ Restored original name: {original_tournament['name']}")
    
    log("✅ TEST 2 PASSED: PUT /api/admin/tournament")


def test_get_magazine_by_id():
    """Test 3: GET /api/magazine/{id} (public, no auth)"""
    log("\n" + "="*60)
    log("TEST 3: GET /api/magazine/{id}")
    log("="*60)
    
    # First, create a magazine item with mentions
    log("Creating a test magazine item...")
    resp_create = requests.post(f"{BASE_URL}/admin/magazine",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "title": "Test Magazine",
            "body": "This is a test body with @Ana Sayfa mention",
            "image_url": "",
            "video_url": "",
            "is_leader_highlight": False,
            "mentions": [
                {
                    "type": "page",
                    "label": "Ana Sayfa",
                    "url": "/",
                    "tag": "Ana Sayfa",
                    "ref_id": ""
                }
            ]
        })
    
    assert resp_create.status_code == 200, f"Magazine creation failed: {resp_create.status_code} {resp_create.text}"
    created = resp_create.json()
    magazine_id = created["id"]
    log(f"✓ Magazine created with id: {magazine_id}")
    
    # Test 3a: Fetch by id (no auth)
    log("\n--- Test 3a: Fetch by id (no auth) ---")
    resp = requests.get(f"{BASE_URL}/magazine/{magazine_id}")
    
    assert resp.status_code == 200, f"GET magazine by id failed: {resp.status_code} {resp.text}"
    data = resp.json()
    
    log(f"Response: {json.dumps(data, indent=2)}")
    
    # Verify structure
    assert data["id"] == magazine_id, f"ID mismatch: expected {magazine_id}, got {data['id']}"
    assert data["title"] == "Test Magazine", f"Title mismatch: {data['title']}"
    assert "body" in data, "Missing 'body' field"
    assert "mentions" in data, "Missing 'mentions' field"
    assert isinstance(data["mentions"], list), "'mentions' should be a list"
    assert len(data["mentions"]) > 0, "Mentions list should not be empty"
    
    mention = data["mentions"][0]
    assert mention["type"] == "page", f"Mention type should be 'page', got {mention['type']}"
    assert mention["label"] == "Ana Sayfa", f"Mention label mismatch: {mention['label']}"
    
    log(f"✓ Magazine fetched successfully with full doc including mentions")
    
    # Test 3b: Fetch random UUID (should return 404)
    log("\n--- Test 3b: Fetch random UUID (should return 404) ---")
    random_id = str(uuid.uuid4())
    resp_404 = requests.get(f"{BASE_URL}/magazine/{random_id}")
    
    assert resp_404.status_code == 404, f"Random UUID should return 404, got {resp_404.status_code}"
    error_data = resp_404.json()
    assert "detail" in error_data, "404 response should have 'detail' field"
    log(f"✓ Random UUID returned 404 with detail: {error_data['detail']}")
    
    # Clean up: delete the test magazine
    log("\n--- Cleaning up test magazine ---")
    resp_delete = requests.delete(f"{BASE_URL}/admin/magazine/{magazine_id}",
        headers={"Authorization": f"Bearer {founder_token}"})
    assert resp_delete.status_code == 200, f"Magazine deletion failed: {resp_delete.status_code}"
    log(f"✓ Test magazine deleted")
    
    log("✅ TEST 3 PASSED: GET /api/magazine/{id}")


def test_mention_targets():
    """Test 4: GET /api/mention-targets (extended with section mentions)"""
    log("\n" + "="*60)
    log("TEST 4: GET /api/mention-targets")
    log("="*60)
    
    log("Fetching mention targets (founder auth)...")
    resp = requests.get(f"{BASE_URL}/mention-targets",
        headers={"Authorization": f"Bearer {founder_token}"})
    
    assert resp.status_code == 200, f"GET mention-targets failed: {resp.status_code} {resp.text}"
    targets = resp.json()
    
    log(f"Total targets: {len(targets)}")
    
    # Verify structure
    assert isinstance(targets, list), "Response should be a list"
    assert len(targets) > 0, "Targets list should not be empty"
    
    # Check for required section entries
    required_sections = [
        {"label": "Fikstür (Tam Ekran)", "url": "/?section=fixture", "ref_id": "fixture"},
        {"label": "Puan Durumu (Tam Ekran)", "url": "/?section=standings", "ref_id": "standings"},
        {"label": "Kupa Ağacı (Tam Ekran)", "url": "/?section=cup", "ref_id": "cup"},
        {"label": "Gösteri Maçları", "url": "/?section=exhibition", "ref_id": "exhibition"},
        {"label": "Magazin Arşivi", "url": "/?section=magazine", "ref_id": "magazine"}
    ]
    
    log("\n--- Verifying required section entries ---")
    section_targets = [t for t in targets if t.get("type") == "section"]
    log(f"Found {len(section_targets)} section-type targets")
    
    for req in required_sections:
        matching = [t for t in section_targets 
                   if t.get("label") == req["label"] 
                   and t.get("url") == req["url"]
                   and t.get("ref_id") == req["ref_id"]]
        
        assert len(matching) > 0, f"Missing required section: {req['label']} with url={req['url']}, ref_id={req['ref_id']}"
        log(f"✓ Found: {req['label']} → {req['url']} (ref_id={req['ref_id']})")
    
    # Verify page entries still exist
    log("\n--- Verifying page entries ---")
    page_targets = [t for t in targets if t.get("type") == "page"]
    log(f"Found {len(page_targets)} page-type targets")
    
    ana_sayfa = [t for t in page_targets if t.get("label") == "Ana Sayfa"]
    assert len(ana_sayfa) > 0, "Missing 'Ana Sayfa' page entry"
    log(f"✓ Found: Ana Sayfa → {ana_sayfa[0]['url']}")
    
    takimlar = [t for t in page_targets if t.get("label") == "Takımlar"]
    assert len(takimlar) > 0, "Missing 'Takımlar' page entry"
    log(f"✓ Found: Takımlar → {takimlar[0]['url']}")
    
    # Verify team and user entries exist
    log("\n--- Verifying team and user entries ---")
    team_targets = [t for t in targets if t.get("type") == "team"]
    user_targets = [t for t in targets if t.get("type") == "user"]
    
    log(f"Found {len(team_targets)} team-type targets")
    log(f"Found {len(user_targets)} user-type targets")
    
    # According to review request, DB has 4 teams (Takım 1-4)
    assert len(team_targets) >= 4, f"Expected at least 4 teams, got {len(team_targets)}"
    assert len(user_targets) >= 4, f"Expected at least 4 users, got {len(user_targets)}"
    
    log(f"✓ Team and user entries present")
    
    log("✅ TEST 4 PASSED: GET /api/mention-targets")


def test_post_match_magazine():
    """Test 5: POST /api/admin/matches/{id}/magazine (with mentions support)"""
    log("\n" + "="*60)
    log("TEST 5: POST /api/admin/matches/{id}/magazine")
    log("="*60)
    
    # Get existing matches
    log("Fetching existing matches...")
    resp_matches = requests.get(f"{BASE_URL}/matches")
    assert resp_matches.status_code == 200, f"Get matches failed: {resp_matches.status_code}"
    matches = resp_matches.json()
    
    # Find a played match
    played_matches = [m for m in matches if m.get("status") == "finished"]
    
    if len(played_matches) == 0:
        log("⚠ No played matches found, skipping this test")
        log("✅ TEST 5 SKIPPED: POST /api/admin/matches/{id}/magazine (no played matches)")
        return
    
    match = played_matches[0]
    match_id = match["id"]
    log(f"Selected match: {match['home']['name']} vs {match['away']['name']} (id: {match_id})")
    
    # Create a magazine on this match with mentions
    log("\n--- Creating magazine on match with mentions ---")
    resp = requests.post(f"{BASE_URL}/admin/matches/{match_id}/magazine",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "title": "Maç Özeti",
            "body": "Harika bir maç! @Ana Sayfa'da paylaşıldı.",
            "image_url": "",
            "video_url": "",
            "mentions": [
                {
                    "type": "page",
                    "label": "Ana Sayfa",
                    "url": "/",
                    "tag": "Ana Sayfa",
                    "ref_id": ""
                }
            ]
        })
    
    assert resp.status_code == 200, f"POST match magazine failed: {resp.status_code} {resp.text}"
    data = resp.json()
    
    log(f"Response: {json.dumps(data, indent=2)}")
    
    # Verify structure
    assert "id" in data, "Response missing 'id' field"
    assert data["title"] == "Maç Özeti", f"Title mismatch: {data['title']}"
    assert "mentions" in data, "Response missing 'mentions' field"
    assert isinstance(data["mentions"], list), "'mentions' should be a list"
    assert len(data["mentions"]) > 0, "Mentions array should be populated"
    
    mention = data["mentions"][0]
    assert mention["type"] == "page", f"Mention type should be 'page', got {mention['type']}"
    
    log(f"✓ Magazine created on match with mentions array populated")
    
    # Verify via GET /api/matches/{match_id}/magazine
    log("\n--- Verifying via GET /api/matches/{match_id}/magazine ---")
    resp_get = requests.get(f"{BASE_URL}/matches/{match_id}/magazine",
        headers={"Authorization": f"Bearer {founder_token}"})
    
    assert resp_get.status_code == 200, f"GET match magazine failed: {resp_get.status_code}"
    match_magazines = resp_get.json()
    
    # Find our created magazine
    created_mag = [m for m in match_magazines if m["id"] == data["id"]]
    assert len(created_mag) > 0, "Created magazine not found in match magazines list"
    
    log(f"✓ Magazine found in match magazines list")
    
    # Clean up: delete the test magazine
    log("\n--- Cleaning up test magazine ---")
    resp_delete = requests.delete(f"{BASE_URL}/admin/magazine/{data['id']}",
        headers={"Authorization": f"Bearer {founder_token}"})
    assert resp_delete.status_code == 200, f"Magazine deletion failed: {resp_delete.status_code}"
    log(f"✓ Test magazine deleted")
    
    log("✅ TEST 5 PASSED: POST /api/admin/matches/{id}/magazine")


def main():
    global founder_token
    
    log("Starting 2026-07 Session Backend Tests...")
    log(f"Backend URL: {BASE_URL}")
    
    try:
        # Login as founder
        login_founder()
        
        # Run tests
        test_keepalive()
        test_put_tournament()
        test_get_magazine_by_id()
        test_mention_targets()
        test_post_match_magazine()
        
        log("\n" + "="*60)
        log("✅ ALL TESTS PASSED!")
        log("="*60)
        
    except AssertionError as e:
        log(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        log(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()
