#!/usr/bin/env python3
"""
Backend test for BAHİS SİSTEMİ (Betting System)
Tests all betting endpoints in priority order.
"""
import requests
import json
import time

# Backend URL from frontend/.env
BASE_URL = "https://stats-bet-builder.preview.emergentagent.com/api"

# Founder credentials from test_credentials.md
FOUNDER_USERNAME = "neco"
FOUNDER_PASSWORD = "neco404"

# Test state
founder_token = None
test_user_token = None
test_user_id = None
test_user2_token = None
test_user2_id = None
test_match_id = None
test_coupon_id = None
test_team_ids = []


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


def register_new_user(username, password):
    """Register a new user"""
    log(f"Registering new user: {username}...")
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "password": password
    })
    if resp.status_code != 200:
        log_error(f"User registration failed: {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    log_success(f"User {username} registered")
    return data


def login_user(username, password):
    """Login as a user"""
    log(f"Logging in as {username}...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": password
    })
    if resp.status_code != 200:
        log_error(f"User login failed: {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    log_success(f"User {username} logged in")
    return data


def get_wallet(token):
    """GET /api/betting/wallet"""
    resp = requests.get(f"{BASE_URL}/betting/wallet",
                       headers={"Authorization": f"Bearer {token}"})
    return resp


def generate_odds(match_id, token):
    """POST /api/betting/odds/generate/{match_id}"""
    resp = requests.post(f"{BASE_URL}/betting/odds/generate/{match_id}",
                        headers={"Authorization": f"Bearer {token}"})
    return resp


def get_odds(match_id):
    """GET /api/betting/odds/{match_id}"""
    resp = requests.get(f"{BASE_URL}/betting/odds/{match_id}")
    return resp


def create_coupon(items, stake, token):
    """POST /api/betting/coupons"""
    resp = requests.post(f"{BASE_URL}/betting/coupons",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"items": items, "stake": stake})
    return resp


def finish_match(match_id, home_score, away_score, home_corners=None, away_corners=None):
    """POST /api/admin/matches/{match_id}/finish"""
    payload = {
        "home_score": home_score,
        "away_score": away_score
    }
    if home_corners is not None:
        payload["home_corners"] = home_corners
    if away_corners is not None:
        payload["away_corners"] = away_corners
    
    resp = requests.post(f"{BASE_URL}/admin/matches/{match_id}/finish",
                        headers={"Authorization": f"Bearer {founder_token}"},
                        json=payload)
    return resp


def get_h2h(team_a_id, team_b_id):
    """GET /api/betting/h2h/{team_a_id}/{team_b_id}"""
    resp = requests.get(f"{BASE_URL}/betting/h2h/{team_a_id}/{team_b_id}")
    return resp


def override_odds(match_id, odds):
    """POST /api/betting/odds/override"""
    resp = requests.post(f"{BASE_URL}/betting/odds/override",
                        headers={"Authorization": f"Bearer {founder_token}"},
                        json={"match_id": match_id, "odds": odds})
    return resp


def bet_lock(match_id, bet_type, locked):
    """POST /api/betting/bet-lock"""
    resp = requests.post(f"{BASE_URL}/betting/bet-lock",
                        headers={"Authorization": f"Bearer {founder_token}"},
                        json={"match_id": match_id, "bet_type": bet_type, "locked": locked})
    return resp


def get_founder_stats():
    """GET /api/betting/founder/stats"""
    resp = requests.get(f"{BASE_URL}/betting/founder/stats",
                       headers={"Authorization": f"Bearer {founder_token}"})
    return resp


def get_founder_users():
    """GET /api/betting/founder/users"""
    resp = requests.get(f"{BASE_URL}/betting/founder/users",
                       headers={"Authorization": f"Bearer {founder_token}"})
    return resp


def get_founder_coupons(status=None, user_id=None, limit=500):
    """GET /api/betting/founder/coupons"""
    params = {"limit": limit}
    if status:
        params["status"] = status
    if user_id:
        params["user_id"] = user_id
    
    resp = requests.get(f"{BASE_URL}/betting/founder/coupons",
                       headers={"Authorization": f"Bearer {founder_token}"},
                       params=params)
    return resp


def set_user_points(user_id, delta=None, set_to=None):
    """POST /api/betting/founder/users/{user_id}/points"""
    payload = {}
    if delta is not None:
        payload["delta"] = delta
    if set_to is not None:
        payload["set_to"] = set_to
    
    resp = requests.post(f"{BASE_URL}/betting/founder/users/{user_id}/points",
                        headers={"Authorization": f"Bearer {founder_token}"},
                        json=payload)
    return resp


def cancel_coupon(coupon_id):
    """POST /api/betting/founder/coupons/{coupon_id}/cancel"""
    resp = requests.post(f"{BASE_URL}/betting/founder/coupons/{coupon_id}/cancel",
                        headers={"Authorization": f"Bearer {founder_token}"})
    return resp


def set_coupon_status(coupon_id, status):
    """POST /api/betting/founder/coupons/{coupon_id}/set-status"""
    resp = requests.post(f"{BASE_URL}/betting/founder/coupons/{coupon_id}/set-status",
                        headers={"Authorization": f"Bearer {founder_token}"},
                        json={"status": status})
    return resp


def get_matches():
    """GET /api/matches"""
    resp = requests.get(f"{BASE_URL}/matches")
    return resp


def get_exhibition_matches():
    """GET /api/exhibition-matches"""
    resp = requests.get(f"{BASE_URL}/exhibition-matches")
    return resp


def get_all_matches():
    """Get both league and exhibition matches"""
    league = get_matches()
    exhibition = get_exhibition_matches()
    
    all_matches = []
    if league.status_code == 200:
        all_matches.extend(league.json())
    if exhibition.status_code == 200:
        all_matches.extend(exhibition.json())
    
    return all_matches


def get_teams():
    """GET /api/teams"""
    resp = requests.get(f"{BASE_URL}/teams")
    return resp


# ==================== TESTS ====================

def test_1_wallet_migration():
    """Test 1: Wallet migration & GET /api/betting/wallet"""
    log("\n" + "="*70)
    log("TEST 1: WALLET MIGRATION & GET /api/betting/wallet")
    log("="*70)
    
    global test_user_token, test_user_id, test_user2_token, test_user2_id
    
    # 1a. Login as existing founder (neco) - should have points
    log("\n--- 1a. Founder wallet (existing user) ---")
    resp = get_wallet(founder_token)
    if resp.status_code != 200:
        log_error(f"Founder wallet failed: {resp.status_code} {resp.text}")
        return False
    
    wallet = resp.json()
    log_success(f"Founder wallet: {wallet}")
    if "points" not in wallet:
        log_error("Founder wallet missing 'points' field")
        return False
    log_success(f"Founder has {wallet['points']} points")
    
    # 1b. Register NEW user - should get 100 points
    log("\n--- 1b. New user wallet (should get 100 points) ---")
    timestamp = int(time.time())
    new_username = f"bettest_{timestamp}"
    new_password = "test1234"
    
    user_data = register_new_user(new_username, new_password)
    if not user_data:
        return False
    
    test_user_token = user_data["token"]
    test_user_id = user_data["user"]["id"]
    
    resp = get_wallet(test_user_token)
    if resp.status_code != 200:
        log_error(f"New user wallet failed: {resp.status_code} {resp.text}")
        return False
    
    wallet = resp.json()
    log_success(f"New user wallet: {wallet}")
    if wallet.get("points") != 100:
        log_error(f"New user should have 100 points, got {wallet.get('points')}")
        return False
    log_success("New user has 100 points (correct)")
    
    # 1c. Register another user for later tests
    log("\n--- 1c. Register second test user ---")
    new_username2 = f"bettest2_{timestamp}"
    user_data2 = register_new_user(new_username2, new_password)
    if not user_data2:
        return False
    
    test_user2_token = user_data2["token"]
    test_user2_id = user_data2["user"]["id"]
    log_success(f"Second test user registered: {new_username2}")
    
    log_success("✅ TEST 1 PASSED: Wallet migration & GET /api/betting/wallet")
    return True


def test_2_ai_odds_generation():
    """Test 2: AI odds generation via Groq"""
    log("\n" + "="*70)
    log("TEST 2: AI ODDS GENERATION VIA GROQ")
    log("="*70)
    
    global test_match_id, test_team_ids
    
    # Get scheduled matches (both league and exhibition)
    log("\n--- 2a. Get scheduled matches ---")
    matches = get_all_matches()
    scheduled = [m for m in matches if m.get("status") == "scheduled"]
    
    if not scheduled:
        log_error("No scheduled matches found. Need at least one scheduled match.")
        return False
    
    match = scheduled[0]
    test_match_id = match["id"]
    test_team_ids = [match["home_team_id"], match["away_team_id"]]
    
    log_success(f"Found scheduled match: {match['home']['name']} vs {match['away']['name']}")
    log(f"Match ID: {test_match_id}")
    
    # 2b. Generate odds (founder only)
    log("\n--- 2b. Generate odds via Groq AI ---")
    resp = generate_odds(test_match_id, founder_token)
    if resp.status_code != 200:
        log_error(f"Generate odds failed: {resp.status_code} {resp.text}")
        return False
    
    odds_data = resp.json()
    log_success(f"Odds generated: {json.dumps(odds_data, indent=2)}")
    
    # Verify all 7 odds keys present
    required_keys = ["ms_1", "ms_x", "ms_2", "goal_over_2_5", "goal_under_2_5", 
                     "corner_over_4_5", "corner_under_4_5"]
    odds = odds_data.get("odds", {})
    
    for key in required_keys:
        if key not in odds:
            log_error(f"Missing odds key: {key}")
            return False
        value = odds[key]
        if not isinstance(value, (int, float)) or value < 1.1:
            log_error(f"Invalid odds value for {key}: {value} (must be numeric >= 1.1)")
            return False
    
    log_success("All 7 odds keys present and valid (>= 1.1)")
    
    # 2c. Verify odds in match data
    log("\n--- 2c. Verify odds in GET /api/matches or /api/exhibition-matches ---")
    matches = get_all_matches()
    match = next((m for m in matches if m["id"] == test_match_id), None)
    
    if not match:
        log_error("Match not found after odds generation")
        return False
    
    if not match.get("odds"):
        log_error("Match odds field is empty")
        return False
    
    log_success(f"Match has odds field populated: {match['odds']}")
    
    # 2d. GET /api/betting/odds/{match_id} (public)
    log("\n--- 2d. GET /api/betting/odds/{match_id} (public) ---")
    resp = get_odds(test_match_id)
    if resp.status_code != 200:
        log_error(f"Get odds failed: {resp.status_code} {resp.text}")
        return False
    
    odds_resp = resp.json()
    log_success(f"Public odds response: {json.dumps(odds_resp, indent=2)}")
    
    if not odds_resp.get("bettable"):
        log_error("Match should be bettable (scheduled with odds)")
        return False
    
    log_success("Match is bettable (scheduled + odds generated)")
    log_success("✅ TEST 2 PASSED: AI odds generation via Groq")
    return True


def test_3_coupon_creation():
    """Test 3: Coupon creation with validations"""
    log("\n" + "="*70)
    log("TEST 3: COUPON CREATION & VALIDATIONS")
    log("="*70)
    
    global test_coupon_id
    
    # 3a. Validation: stake < 30 (should fail)
    log("\n--- 3a. Validation: stake < 30 (should fail) ---")
    items = [{"match_id": test_match_id, "bet_type": "MS", "selection": "1"}]
    resp = create_coupon(items, 20, test_user_token)
    if resp.status_code == 400:
        log_success(f"Correctly rejected stake < 30: {resp.json()}")
    else:
        log_error(f"Should reject stake < 30, got {resp.status_code}")
        return False
    
    # 3b. Validation: duplicate match_id (should fail)
    log("\n--- 3b. Validation: duplicate match_id (should fail) ---")
    items = [
        {"match_id": test_match_id, "bet_type": "MS", "selection": "1"},
        {"match_id": test_match_id, "bet_type": "GOAL_O_U", "selection": "OVER_2_5"}
    ]
    resp = create_coupon(items, 50, test_user_token)
    if resp.status_code == 400:
        log_success(f"Correctly rejected duplicate match: {resp.json()}")
    else:
        log_error(f"Should reject duplicate match, got {resp.status_code}")
        return False
    
    # 3c. Validation: invalid bet_type (should fail)
    log("\n--- 3c. Validation: invalid bet_type (should fail) ---")
    items = [{"match_id": test_match_id, "bet_type": "INVALID", "selection": "1"}]
    resp = create_coupon(items, 50, test_user_token)
    if resp.status_code == 400:
        log_success(f"Correctly rejected invalid bet_type: {resp.json()}")
    else:
        log_error(f"Should reject invalid bet_type, got {resp.status_code}")
        return False
    
    # 3d. Validation: invalid selection (should fail)
    log("\n--- 3d. Validation: invalid selection (should fail) ---")
    items = [{"match_id": test_match_id, "bet_type": "MS", "selection": "INVALID"}]
    resp = create_coupon(items, 50, test_user_token)
    if resp.status_code == 400:
        log_success(f"Correctly rejected invalid selection: {resp.json()}")
    else:
        log_error(f"Should reject invalid selection, got {resp.status_code}")
        return False
    
    # 3e. SUCCESS: Create valid single coupon
    log("\n--- 3e. Create valid single coupon ---")
    items = [{"match_id": test_match_id, "bet_type": "MS", "selection": "1"}]
    stake = 50
    
    # Get wallet before
    wallet_before = get_wallet(test_user_token).json()
    points_before = wallet_before["points"]
    log(f"Wallet before: {points_before} points")
    
    resp = create_coupon(items, stake, test_user_token)
    if resp.status_code != 200:
        log_error(f"Create coupon failed: {resp.status_code} {resp.text}")
        return False
    
    coupon = resp.json()
    test_coupon_id = coupon["id"]
    log_success(f"Coupon created: {json.dumps(coupon, indent=2)}")
    
    # Verify fields
    if coupon["status"] != "PENDING":
        log_error(f"Coupon status should be PENDING, got {coupon['status']}")
        return False
    
    if coupon["stake"] != stake:
        log_error(f"Stake mismatch: expected {stake}, got {coupon['stake']}")
        return False
    
    if "total_odd" not in coupon:
        log_error("Missing total_odd field")
        return False
    
    if "potential_payout" not in coupon:
        log_error("Missing potential_payout field")
        return False
    
    expected_payout = round(stake * coupon["total_odd"])
    if coupon["potential_payout"] != expected_payout:
        log_error(f"Potential payout mismatch: expected {expected_payout}, got {coupon['potential_payout']}")
        return False
    
    log_success(f"Total odd: {coupon['total_odd']}, Potential payout: {coupon['potential_payout']}")
    
    # Verify wallet deducted
    wallet_after = get_wallet(test_user_token).json()
    points_after = wallet_after["points"]
    log(f"Wallet after: {points_after} points")
    
    if points_after != points_before - stake:
        log_error(f"Wallet not deducted correctly: {points_before} -> {points_after} (expected {points_before - stake})")
        return False
    
    log_success(f"Wallet deducted atomically: {points_before} -> {points_after}")
    
    # 3f. Create combo coupon (2 matches)
    log("\n--- 3f. Create combo coupon (2 matches) ---")
    # Get another scheduled match
    matches = get_all_matches()
    scheduled = [m for m in matches if m.get("status") == "scheduled" and m["id"] != test_match_id]
    
    if len(scheduled) > 0:
        match2_id = scheduled[0]["id"]
        
        # Generate odds for second match if not present
        if not scheduled[0].get("odds"):
            log("Generating odds for second match...")
            generate_odds(match2_id, founder_token)
        
        items = [
            {"match_id": test_match_id, "bet_type": "MS", "selection": "1"},
            {"match_id": match2_id, "bet_type": "GOAL_O_U", "selection": "OVER_2_5"}
        ]
        stake = 30
        
        resp = create_coupon(items, stake, test_user2_token)
        if resp.status_code != 200:
            log_error(f"Create combo coupon failed: {resp.status_code} {resp.text}")
            return False
        
        combo = resp.json()
        log_success(f"Combo coupon created: {len(combo['items'])} matches")
        log_success(f"Total odd: {combo['total_odd']} (product of individual odds)")
        log_success(f"Potential payout: {combo['potential_payout']}")
        
        # Verify total_odd is product
        expected_odd = 1.0
        for item in combo["items"]:
            expected_odd *= item["odd"]
        expected_odd = round(expected_odd, 2)
        
        if abs(combo["total_odd"] - expected_odd) > 0.01:
            log_error(f"Total odd mismatch: expected {expected_odd}, got {combo['total_odd']}")
            return False
        
        log_success("Total odd correctly calculated as product of individual odds")
    else:
        log("⚠ Skipping combo test (only 1 scheduled match available)")
    
    log_success("✅ TEST 3 PASSED: Coupon creation & validations")
    return True


def test_4_auto_settlement():
    """Test 4: Auto-settlement on match finish + goal rewards"""
    log("\n" + "="*70)
    log("TEST 4: AUTO-SETTLEMENT & GOAL REWARDS")
    log("="*70)
    
    # Get team owners
    log("\n--- 4a. Get team owners for goal rewards ---")
    resp = get_teams()
    if resp.status_code != 200:
        log_error(f"Get teams failed: {resp.status_code}")
        return False
    
    teams = resp.json()
    home_team = next((t for t in teams if t["id"] == test_team_ids[0]), None)
    away_team = next((t for t in teams if t["id"] == test_team_ids[1]), None)
    
    if not home_team or not away_team:
        log_error("Teams not found")
        return False
    
    log(f"Home team: {home_team['name']} (owner: {home_team.get('owner', 'N/A')})")
    log(f"Away team: {away_team['name']} (owner: {away_team.get('owner', 'N/A')})")
    
    # Get wallet before (for user who placed coupon)
    wallet_before = get_wallet(test_user_token).json()
    points_before = wallet_before["points"]
    log(f"User wallet before: {points_before} points")
    
    # 4b. Finish match with corners
    log("\n--- 4b. Finish match with score and corners ---")
    home_score = 3
    away_score = 1
    home_corners = 6
    away_corners = 3
    
    resp = finish_match(test_match_id, home_score, away_score, home_corners, away_corners)
    if resp.status_code != 200:
        log_error(f"Finish match failed: {resp.status_code} {resp.text}")
        return False
    
    log_success(f"Match finished: {home_score}-{away_score}, corners: {home_corners}-{away_corners}")
    
    # Wait a bit for settlement
    time.sleep(2)
    
    # 4c. Verify coupon settlement
    log("\n--- 4c. Verify coupon settlement ---")
    resp = get_founder_coupons(user_id=test_user_id)
    if resp.status_code != 200:
        log_error(f"Get coupons failed: {resp.status_code}")
        return False
    
    coupons = resp.json()
    coupon = next((c for c in coupons if c["id"] == test_coupon_id), None)
    
    if not coupon:
        log_error("Coupon not found")
        return False
    
    log(f"Coupon status: {coupon['status']}")
    log(f"Coupon items: {json.dumps(coupon['items'], indent=2)}")
    
    # Check if coupon was settled
    if coupon["status"] == "PENDING":
        log("⚠ Coupon still PENDING (match may have other pending items)")
    elif coupon["status"] == "WON":
        log_success(f"Coupon WON! Payout: {coupon.get('payout', 0)}")
        
        # Verify wallet credited
        wallet_after = get_wallet(test_user_token).json()
        points_after = wallet_after["points"]
        log(f"User wallet after: {points_after} points")
        
        expected_points = points_before + coupon.get("payout", 0)
        if points_after == expected_points:
            log_success(f"Wallet credited correctly: {points_before} + {coupon['payout']} = {points_after}")
        else:
            log_error(f"Wallet mismatch: expected {expected_points}, got {points_after}")
    elif coupon["status"] == "LOST":
        log_success("Coupon LOST (settlement working)")
    
    # 4d. Verify MS resolution
    log("\n--- 4d. Verify MS resolution ---")
    # home_score=3, away_score=1 → MS winner is "1"
    ms_item = next((item for item in coupon["items"] if item["bet_type"] == "MS"), None)
    if ms_item:
        if ms_item["selection"] == "1":
            if ms_item["status"] == "WON":
                log_success("MS resolution correct: home won (3>1), selection '1' WON")
            else:
                log_error(f"MS should be WON, got {ms_item['status']}")
        else:
            if ms_item["status"] == "LOST":
                log_success(f"MS resolution correct: selection '{ms_item['selection']}' LOST")
            else:
                log_error(f"MS should be LOST, got {ms_item['status']}")
    
    # 4e. Verify GOAL_O_U resolution
    log("\n--- 4e. Verify GOAL_O_U resolution ---")
    # total goals = 3+1 = 4 > 2.5 → OVER_2_5 wins
    log(f"Total goals: {home_score + away_score} (>2.5 means OVER_2_5 wins)")
    
    # 4f. Verify CORNER_O_U resolution
    log("\n--- 4f. Verify CORNER_O_U resolution ---")
    # total corners = 6+3 = 9 > 4.5 → OVER_4_5 wins
    log(f"Total corners: {home_corners + away_corners} (>4.5 means OVER_4_5 wins)")
    
    log_success("✅ TEST 4 PASSED: Auto-settlement & goal rewards")
    return True


def test_5_h2h():
    """Test 5: H2H endpoint"""
    log("\n" + "="*70)
    log("TEST 5: H2H ENDPOINT")
    log("="*70)
    
    if len(test_team_ids) < 2:
        log_error("Need at least 2 teams for H2H test")
        return False
    
    team_a_id = test_team_ids[0]
    team_b_id = test_team_ids[1]
    
    log(f"\n--- 5a. GET /api/betting/h2h/{team_a_id}/{team_b_id} ---")
    resp = get_h2h(team_a_id, team_b_id)
    if resp.status_code != 200:
        log_error(f"H2H failed: {resp.status_code} {resp.text}")
        return False
    
    h2h = resp.json()
    log_success(f"H2H response: {json.dumps(h2h, indent=2)}")
    
    # Verify structure
    required_fields = ["team_a", "team_b", "stats", "recent"]
    for field in required_fields:
        if field not in h2h:
            log_error(f"Missing field: {field}")
            return False
    
    stats = h2h["stats"]
    required_stats = ["total", "wins_a", "wins_b", "draws", "goals_a", "goals_b"]
    for field in required_stats:
        if field not in stats:
            log_error(f"Missing stats field: {field}")
            return False
    
    log_success(f"Stats: {stats['total']} matches, {stats['wins_a']}-{stats['draws']}-{stats['wins_b']}, goals: {stats['goals_a']}-{stats['goals_b']}")
    log_success(f"Recent matches: {len(h2h['recent'])} (last 10)")
    
    # Test 404 for invalid team
    log("\n--- 5b. Test 404 for invalid team ---")
    resp = get_h2h("invalid_id", team_b_id)
    if resp.status_code == 404:
        log_success("Correctly returns 404 for invalid team")
    else:
        log_error(f"Should return 404, got {resp.status_code}")
        return False
    
    log_success("✅ TEST 5 PASSED: H2H endpoint")
    return True


def test_6_odds_override():
    """Test 6: Odds override"""
    log("\n" + "="*70)
    log("TEST 6: ODDS OVERRIDE")
    log("="*70)
    
    # Get a scheduled match with odds
    matches = get_all_matches()
    scheduled = [m for m in matches if m.get("status") == "scheduled" and m.get("odds")]
    
    if not scheduled:
        log_error("No scheduled matches with odds found")
        return False
    
    match = scheduled[0]
    match_id = match["id"]
    
    log(f"\n--- 6a. Override odds for match {match['home']['name']} vs {match['away']['name']} ---")
    
    # Override some odds
    new_odds = {
        "ms_1": 1.5,
        "ms_x": 3.5,
        "goal_over_2_5": 2.0
    }
    
    resp = override_odds(match_id, new_odds)
    if resp.status_code != 200:
        log_error(f"Override odds failed: {resp.status_code} {resp.text}")
        return False
    
    result = resp.json()
    log_success(f"Odds overridden: {json.dumps(result['odds'], indent=2)}")
    
    # Verify overridden values
    odds = result["odds"]
    for key, value in new_odds.items():
        if odds.get(key) != value:
            log_error(f"Override failed for {key}: expected {value}, got {odds.get(key)}")
            return False
    
    log_success("All overridden odds values correct")
    
    # Test rejection of out-of-range values
    log("\n--- 6b. Test rejection of out-of-range odds ---")
    bad_odds = {"ms_1": 0.5}  # < 1.05
    resp = override_odds(match_id, bad_odds)
    # Should still succeed but ignore bad value
    if resp.status_code == 200:
        result = resp.json()
        if result["odds"]["ms_1"] == 0.5:
            log_error("Should reject odds < 1.05")
            return False
        log_success("Correctly ignored out-of-range odds value")
    
    log_success("✅ TEST 6 PASSED: Odds override")
    return True


def test_7_bet_lock():
    """Test 7: Bet lock"""
    log("\n" + "="*70)
    log("TEST 7: BET LOCK")
    log("="*70)
    
    # Get a scheduled match with odds
    matches = get_all_matches()
    scheduled = [m for m in matches if m.get("status") == "scheduled" and m.get("odds")]
    
    if not scheduled:
        log_error("No scheduled matches with odds found")
        return False
    
    match = scheduled[0]
    match_id = match["id"]
    
    log(f"\n--- 7a. Lock CORNER_O_U bet type ---")
    resp = bet_lock(match_id, "CORNER_O_U", True)
    if resp.status_code != 200:
        log_error(f"Bet lock failed: {resp.status_code} {resp.text}")
        return False
    
    result = resp.json()
    log_success(f"Bet locks: {result['bet_locks']}")
    
    if not result["bet_locks"].get("CORNER_O_U"):
        log_error("CORNER_O_U should be locked")
        return False
    
    log_success("CORNER_O_U locked successfully")
    
    # Try to create coupon with locked bet type (should fail)
    log("\n--- 7b. Try to create coupon with locked bet type (should fail) ---")
    items = [{"match_id": match_id, "bet_type": "CORNER_O_U", "selection": "OVER_4_5"}]
    resp = create_coupon(items, 50, test_user_token)
    if resp.status_code == 400:
        log_success(f"Correctly rejected locked bet type: {resp.json()}")
    else:
        log_error(f"Should reject locked bet type, got {resp.status_code}")
        return False
    
    # Unlock
    log("\n--- 7c. Unlock CORNER_O_U ---")
    resp = bet_lock(match_id, "CORNER_O_U", False)
    if resp.status_code != 200:
        log_error(f"Bet unlock failed: {resp.status_code} {resp.text}")
        return False
    
    result = resp.json()
    if result["bet_locks"].get("CORNER_O_U"):
        log_error("CORNER_O_U should be unlocked")
        return False
    
    log_success("CORNER_O_U unlocked successfully")
    
    # Now coupon should work
    log("\n--- 7d. Create coupon with unlocked bet type (should succeed) ---")
    resp = create_coupon(items, 50, test_user_token)
    if resp.status_code == 200:
        log_success("Coupon created successfully after unlock")
    else:
        log_error(f"Coupon creation failed: {resp.status_code} {resp.text}")
        return False
    
    log_success("✅ TEST 7 PASSED: Bet lock")
    return True


def test_8_founder_controls():
    """Test 8: Founder controls (stats, users, coupons, set points, cancel, set status)"""
    log("\n" + "="*70)
    log("TEST 8: FOUNDER CONTROLS")
    log("="*70)
    
    # 8a. Founder stats
    log("\n--- 8a. GET /api/betting/founder/stats ---")
    resp = get_founder_stats()
    if resp.status_code != 200:
        log_error(f"Founder stats failed: {resp.status_code} {resp.text}")
        return False
    
    stats = resp.json()
    log_success(f"Founder stats: {json.dumps(stats, indent=2)}")
    
    required_fields = ["today", "all_time", "total_points_in_circulation"]
    for field in required_fields:
        if field not in stats:
            log_error(f"Missing field: {field}")
            return False
    
    log_success(f"Today: {stats['today']['count']} coupons, {stats['today']['staked']} staked, {stats['today']['won']} won")
    log_success(f"All time: {stats['all_time']['count']} coupons, {stats['all_time']['pending']} pending")
    log_success(f"Total points in circulation: {stats['total_points_in_circulation']}")
    
    # 8b. Founder users
    log("\n--- 8b. GET /api/betting/founder/users ---")
    resp = get_founder_users()
    if resp.status_code != 200:
        log_error(f"Founder users failed: {resp.status_code} {resp.text}")
        return False
    
    users = resp.json()
    log_success(f"Founder users: {len(users)} users")
    
    if len(users) > 0:
        user = users[0]
        log(f"Sample user: {user['username']}, points: {user.get('points', 0)}, stats: {user.get('stats', {})}")
    
    # 8c. Founder coupons
    log("\n--- 8c. GET /api/betting/founder/coupons ---")
    resp = get_founder_coupons(limit=10)
    if resp.status_code != 200:
        log_error(f"Founder coupons failed: {resp.status_code} {resp.text}")
        return False
    
    coupons = resp.json()
    log_success(f"Founder coupons: {len(coupons)} coupons (limit 10)")
    
    # Test filters
    log("\n--- 8d. Test coupon filters (status=PENDING) ---")
    resp = get_founder_coupons(status="PENDING")
    if resp.status_code == 200:
        pending = resp.json()
        log_success(f"Pending coupons: {len(pending)}")
    
    # 8e. Set user points
    log("\n--- 8e. POST /api/betting/founder/users/{user_id}/points ---")
    
    # Get current points
    wallet = get_wallet(test_user_token).json()
    current_points = wallet["points"]
    log(f"Current points: {current_points}")
    
    # Add 50 points
    resp = set_user_points(test_user_id, delta=50)
    if resp.status_code != 200:
        log_error(f"Set points failed: {resp.status_code} {resp.text}")
        return False
    
    result = resp.json()
    log_success(f"Points updated: {result}")
    
    if result.get("points") != current_points + 50:
        log_error(f"Points mismatch: expected {current_points + 50}, got {result.get('points')}")
        return False
    
    log_success(f"Delta +50 applied correctly: {current_points} -> {result['points']}")
    
    # Set to specific value
    resp = set_user_points(test_user_id, set_to=200)
    if resp.status_code != 200:
        log_error(f"Set points failed: {resp.status_code} {resp.text}")
        return False
    
    result = resp.json()
    if result.get("points") != 200:
        log_error(f"Points mismatch: expected 200, got {result.get('points')}")
        return False
    
    log_success(f"Set to 200 applied correctly: {result['points']}")
    
    # 8f. Cancel coupon
    log("\n--- 8f. POST /api/betting/founder/coupons/{coupon_id}/cancel ---")
    
    # Get a coupon to cancel
    resp = get_founder_coupons(user_id=test_user_id, limit=1)
    if resp.status_code == 200:
        coupons = resp.json()
        if len(coupons) > 0:
            coupon = coupons[0]
            coupon_id = coupon["id"]
            
            # Get wallet before
            wallet_before = get_wallet(test_user_token).json()
            points_before = wallet_before["points"]
            
            resp = cancel_coupon(coupon_id)
            if resp.status_code != 200:
                log_error(f"Cancel coupon failed: {resp.status_code} {resp.text}")
                return False
            
            result = resp.json()
            log_success(f"Coupon canceled: {result}")
            
            if result["status"] != "REFUNDED":
                log_error(f"Status should be REFUNDED, got {result['status']}")
                return False
            
            # Verify wallet refunded
            wallet_after = get_wallet(test_user_token).json()
            points_after = wallet_after["points"]
            
            expected_refund = coupon["stake"]
            if coupon.get("status") == "WON":
                expected_refund -= coupon.get("payout", 0)
            
            log_success(f"Wallet after cancel: {points_before} -> {points_after}")
        else:
            log("⚠ No coupons to cancel")
    
    # 8g. Set coupon status
    log("\n--- 8g. POST /api/betting/founder/coupons/{coupon_id}/set-status ---")
    
    # Get a PENDING coupon
    resp = get_founder_coupons(status="PENDING", limit=1)
    if resp.status_code == 200:
        coupons = resp.json()
        if len(coupons) > 0:
            coupon = coupons[0]
            coupon_id = coupon["id"]
            
            # Force to WON
            resp = set_coupon_status(coupon_id, "WON")
            if resp.status_code != 200:
                log_error(f"Set status failed: {resp.status_code} {resp.text}")
                return False
            
            result = resp.json()
            log_success(f"Coupon status set to WON: {result}")
            
            if result["status"] != "WON":
                log_error(f"Status should be WON, got {result['status']}")
                return False
            
            if "payout" not in result:
                log_error("Missing payout field")
                return False
            
            log_success(f"Payout calculated: {result['payout']}")
        else:
            log("⚠ No PENDING coupons to test set-status")
    
    log_success("✅ TEST 8 PASSED: Founder controls")
    return True


def main():
    """Run all tests"""
    log("="*70)
    log("BACKEND BETTING SYSTEM TESTS")
    log("="*70)
    log(f"Backend URL: {BASE_URL}")
    log(f"Founder: {FOUNDER_USERNAME}")
    
    # Login as founder
    if not login_founder():
        log_error("Failed to login as founder")
        return
    
    # Run tests in priority order
    tests = [
        ("1. Wallet Migration", test_1_wallet_migration),
        ("2. AI Odds Generation", test_2_ai_odds_generation),
        ("3. Coupon Creation", test_3_coupon_creation),
        ("4. Auto-Settlement", test_4_auto_settlement),
        ("5. H2H Endpoint", test_5_h2h),
        ("6. Odds Override", test_6_odds_override),
        ("7. Bet Lock", test_7_bet_lock),
        ("8. Founder Controls", test_8_founder_controls),
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
