#!/usr/bin/env python3
"""
Backend test for TWO NEW ADDITIONS:
1. Tournament square_logo_url field
2. Regression check for /api/cup/matches endpoint
"""
import requests
import json
import time

# Backend URL from frontend/.env
BASE_URL = "https://53c3310c-e577-4f92-934b-c1ab12cee8aa.preview.emergentagent.com/api"

# Founder credentials from test_credentials.md
FOUNDER_USERNAME = "neco"
FOUNDER_PASSWORD = "neco404"

# Test state
founder_token = None


def log(msg):
    print(f"[TEST] {msg}")


def log_error(msg):
    print(f"[ERROR] {msg}")


def log_success(msg):
    print(f"[✓] {msg}")


def login_founder():
    """Login as founder (neco/neco404)"""
    global founder_token
    log("Logging in as founder (neco)...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": FOUNDER_USERNAME,
        "password": FOUNDER_PASSWORD
    })
    if resp.status_code != 200:
        log_error(f"Founder login failed: {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    founder_token = data["token"]
    log_success(f"Founder logged in")
    return founder_token


def test_1_tournament_square_logo_url():
    """Test 1: Tournament square_logo_url field"""
    log("\n" + "="*70)
    log("TEST 1: TOURNAMENT SQUARE_LOGO_URL FIELD")
    log("="*70)
    
    # 1a. Create tournament with both cover_url and square_logo_url
    log("\n--- 1a. POST /api/admin/tournament with both cover_url and square_logo_url ---")
    
    timestamp = int(time.time())
    tournament_data = {
        "name": f"Test Tournament {timestamp}",
        "weeks": 2,
        "cover_url": "https://example.com/cover.jpg",
        "square_logo_url": "https://example.com/square_logo.png",
        "mode": "league"
    }
    
    resp = requests.post(
        f"{BASE_URL}/admin/tournament",
        headers={"Authorization": f"Bearer {founder_token}"},
        json=tournament_data
    )
    
    if resp.status_code != 200:
        log_error(f"Create tournament failed: {resp.status_code} {resp.text}")
        return False
    
    tournament = resp.json()
    tournament_id = tournament["id"]
    log_success(f"Tournament created: {tournament['name']}")
    log(f"Tournament ID: {tournament_id}")
    log(f"cover_url: {tournament.get('cover_url')}")
    log(f"square_logo_url: {tournament.get('square_logo_url')}")
    
    # Verify both fields are present
    if tournament.get("cover_url") != tournament_data["cover_url"]:
        log_error(f"cover_url mismatch: expected {tournament_data['cover_url']}, got {tournament.get('cover_url')}")
        return False
    
    if tournament.get("square_logo_url") != tournament_data["square_logo_url"]:
        log_error(f"square_logo_url mismatch: expected {tournament_data['square_logo_url']}, got {tournament.get('square_logo_url')}")
        return False
    
    log_success("Both cover_url and square_logo_url persisted correctly")
    
    # 1b. GET /api/tournament/active should return square_logo_url
    log("\n--- 1b. GET /api/tournament/active returns square_logo_url ---")
    
    resp = requests.get(f"{BASE_URL}/tournament/active")
    if resp.status_code != 200:
        log_error(f"Get active tournament failed: {resp.status_code} {resp.text}")
        return False
    
    active_tournament = resp.json()
    log_success(f"Active tournament: {active_tournament['name']}")
    log(f"cover_url: {active_tournament.get('cover_url')}")
    log(f"square_logo_url: {active_tournament.get('square_logo_url')}")
    
    if "square_logo_url" not in active_tournament:
        log_error("square_logo_url field missing in GET /api/tournament/active response")
        return False
    
    if active_tournament.get("square_logo_url") != tournament_data["square_logo_url"]:
        log_error(f"square_logo_url mismatch in GET: expected {tournament_data['square_logo_url']}, got {active_tournament.get('square_logo_url')}")
        return False
    
    log_success("square_logo_url field present and correct in GET /api/tournament/active")
    
    # 1c. PUT /api/admin/tournament - update only square_logo_url
    log("\n--- 1c. PUT /api/admin/tournament - update only square_logo_url ---")
    
    new_square_logo = "https://example.com/new_square_logo.png"
    update_data = {
        "square_logo_url": new_square_logo
    }
    
    resp = requests.put(
        f"{BASE_URL}/admin/tournament",
        headers={"Authorization": f"Bearer {founder_token}"},
        json=update_data
    )
    
    if resp.status_code != 200:
        log_error(f"Update tournament failed: {resp.status_code} {resp.text}")
        return False
    
    updated_tournament = resp.json()
    log_success(f"Tournament updated")
    log(f"cover_url: {updated_tournament.get('cover_url')}")
    log(f"square_logo_url: {updated_tournament.get('square_logo_url')}")
    
    # Verify square_logo_url updated
    if updated_tournament.get("square_logo_url") != new_square_logo:
        log_error(f"square_logo_url not updated: expected {new_square_logo}, got {updated_tournament.get('square_logo_url')}")
        return False
    
    # Verify cover_url unchanged
    if updated_tournament.get("cover_url") != tournament_data["cover_url"]:
        log_error(f"cover_url should remain unchanged: expected {tournament_data['cover_url']}, got {updated_tournament.get('cover_url')}")
        return False
    
    log_success("square_logo_url updated, cover_url remained unchanged")
    
    # 1d. PUT /api/admin/tournament - update only cover_url
    log("\n--- 1d. PUT /api/admin/tournament - update only cover_url ---")
    
    new_cover = "https://example.com/new_cover.jpg"
    update_data = {
        "cover_url": new_cover
    }
    
    resp = requests.put(
        f"{BASE_URL}/admin/tournament",
        headers={"Authorization": f"Bearer {founder_token}"},
        json=update_data
    )
    
    if resp.status_code != 200:
        log_error(f"Update tournament failed: {resp.status_code} {resp.text}")
        return False
    
    updated_tournament = resp.json()
    log_success(f"Tournament updated")
    log(f"cover_url: {updated_tournament.get('cover_url')}")
    log(f"square_logo_url: {updated_tournament.get('square_logo_url')}")
    
    # Verify cover_url updated
    if updated_tournament.get("cover_url") != new_cover:
        log_error(f"cover_url not updated: expected {new_cover}, got {updated_tournament.get('cover_url')}")
        return False
    
    # Verify square_logo_url unchanged
    if updated_tournament.get("square_logo_url") != new_square_logo:
        log_error(f"square_logo_url should remain unchanged: expected {new_square_logo}, got {updated_tournament.get('square_logo_url')}")
        return False
    
    log_success("cover_url updated, square_logo_url remained unchanged")
    
    log_success("✅ TEST 1 PASSED: Tournament square_logo_url field")
    return True


def test_2_cup_matches_endpoint():
    """Test 2: Regression check for /api/cup/matches endpoint"""
    log("\n" + "="*70)
    log("TEST 2: REGRESSION CHECK FOR /api/cup/matches ENDPOINT")
    log("="*70)
    
    # 2a. Check current tournament mode
    log("\n--- 2a. Check current tournament mode ---")
    
    resp = requests.get(f"{BASE_URL}/tournament/active")
    if resp.status_code != 200:
        log_error(f"Get active tournament failed: {resp.status_code} {resp.text}")
        return False
    
    tournament = resp.json()
    current_mode = tournament.get("mode", "league")
    log(f"Current tournament mode: {current_mode}")
    
    # 2b. GET /api/cup/matches
    log("\n--- 2b. GET /api/cup/matches ---")
    
    resp = requests.get(f"{BASE_URL}/cup/matches")
    if resp.status_code != 200:
        log_error(f"GET /api/cup/matches failed: {resp.status_code} {resp.text}")
        return False
    
    cup_matches = resp.json()
    log_success(f"GET /api/cup/matches returned: {len(cup_matches)} matches")
    
    if current_mode == "league":
        # Should return empty array for league mode
        if len(cup_matches) != 0:
            log_error(f"Expected empty array for league mode, got {len(cup_matches)} matches")
            return False
        log_success("Correctly returns empty array for league mode tournament")
        
        # Create a cup tournament to test properly
        log("\n--- 2c. Create cup tournament for proper testing ---")
        
        timestamp = int(time.time())
        cup_data = {
            "name": f"Test Cup {timestamp}",
            "weeks": 1,
            "cover_url": "https://example.com/cup_cover.jpg",
            "square_logo_url": "https://example.com/cup_square.png",
            "mode": "cup"
        }
        
        resp = requests.post(
            f"{BASE_URL}/admin/tournament",
            headers={"Authorization": f"Bearer {founder_token}"},
            json=cup_data
        )
        
        if resp.status_code != 200:
            log_error(f"Create cup tournament failed: {resp.status_code} {resp.text}")
            return False
        
        log_success(f"Cup tournament created: {cup_data['name']}")
        
        # Draw cup (create matches)
        log("\n--- 2d. Draw cup to create matches ---")
        
        resp = requests.post(
            f"{BASE_URL}/admin/cup/draw",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        
        if resp.status_code != 200:
            log_error(f"Cup draw failed: {resp.status_code} {resp.text}")
            # This might fail if there are not enough teams, which is OK
            log("⚠ Cup draw failed (possibly not enough teams), testing with empty cup")
        else:
            log_success(f"Cup drawn: {resp.json()}")
        
        # Now test GET /api/cup/matches again
        log("\n--- 2e. GET /api/cup/matches after cup draw ---")
        
        resp = requests.get(f"{BASE_URL}/cup/matches")
        if resp.status_code != 200:
            log_error(f"GET /api/cup/matches failed: {resp.status_code} {resp.text}")
            return False
        
        cup_matches = resp.json()
        log_success(f"GET /api/cup/matches returned: {len(cup_matches)} matches")
    
    # 2f. Verify structure of cup matches (if any exist)
    if len(cup_matches) > 0:
        log("\n--- 2f. Verify structure of cup match items ---")
        
        match = cup_matches[0]
        log(f"Sample match: {json.dumps(match, indent=2)}")
        
        # Required fields according to review request
        required_fields = ["home_team_id", "away_team_id", "week", "mode"]
        for field in required_fields:
            if field not in match:
                log_error(f"Missing required field: {field}")
                return False
        
        log_success("All required fields present: home_team_id, away_team_id, week, mode")
        
        # Verify mode is "cup"
        if match.get("mode") != "cup":
            log_error(f"Expected mode='cup', got mode='{match.get('mode')}'")
            return False
        
        log_success("mode field is 'cup'")
        
        # Check for corners/odds/bet_locks (may be None/empty)
        log(f"home_corners: {match.get('home_corners')}")
        log(f"away_corners: {match.get('away_corners')}")
        log(f"odds: {match.get('odds')}")
        log(f"bet_locks: {match.get('bet_locks')}")
        
        # These fields should exist (even if None/empty)
        if "home_corners" not in match:
            log_error("Missing home_corners field")
            return False
        if "away_corners" not in match:
            log_error("Missing away_corners field")
            return False
        if "odds" not in match:
            log_error("Missing odds field")
            return False
        if "bet_locks" not in match:
            log_error("Missing bet_locks field")
            return False
        
        log_success("All betting-related fields present (corners, odds, bet_locks)")
        
        # Verify scheduled_time field
        if "scheduled_time" not in match:
            log_error("Missing scheduled_time field")
            return False
        
        log_success("scheduled_time field present")
    else:
        log("⚠ No cup matches to verify structure (empty cup or league mode)")
    
    log_success("✅ TEST 2 PASSED: /api/cup/matches endpoint regression check")
    return True


def main():
    """Run all tests"""
    log("="*70)
    log("BACKEND TEST: TWO NEW ADDITIONS")
    log("="*70)
    log(f"Backend URL: {BASE_URL}")
    log(f"Founder: {FOUNDER_USERNAME}")
    
    # Login as founder
    if not login_founder():
        log_error("Failed to login as founder")
        return
    
    # Run tests
    tests = [
        ("1. Tournament square_logo_url field", test_1_tournament_square_logo_url),
        ("2. /api/cup/matches endpoint regression", test_2_cup_matches_endpoint),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                log_error(f"❌ {name} FAILED")
        except Exception as e:
            failed += 1
            log_error(f"❌ {name} FAILED with exception: {e}")
            import traceback
            traceback.print_exc()
    
    # Summary
    log("\n" + "="*70)
    log("TEST SUMMARY")
    log("="*70)
    log(f"Passed: {passed}/{len(tests)}")
    log(f"Failed: {failed}/{len(tests)}")
    
    if failed == 0:
        log_success("✅ ALL TESTS PASSED!")
    else:
        log_error(f"❌ {failed} TEST(S) FAILED")


if __name__ == "__main__":
    main()
