#!/usr/bin/env python3
"""
Test remaining betting features: odds override, bet lock, cup corners
"""
import requests
import json

BASE_URL = "https://53c3310c-e577-4f92-934b-c1ab12cee8aa.preview.emergentagent.com/api"
FOUNDER_USERNAME = "neco"
FOUNDER_PASSWORD = "neco404"

def log(msg):
    print(f"[TEST] {msg}")

def login_founder():
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": FOUNDER_USERNAME,
        "password": FOUNDER_PASSWORD
    })
    return resp.json()["token"]

def get_teams():
    resp = requests.get(f"{BASE_URL}/teams")
    return resp.json()

def create_exhibition(home_id, away_id, token):
    resp = requests.post(f"{BASE_URL}/admin/exhibition",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "home_team_id": home_id,
                            "away_team_id": away_id,
                            "scheduled_time": "Test Match"
                        })
    return resp

def generate_odds(match_id, token):
    resp = requests.post(f"{BASE_URL}/betting/odds/generate/{match_id}",
                        headers={"Authorization": f"Bearer {token}"})
    return resp

def override_odds(match_id, odds, token):
    resp = requests.post(f"{BASE_URL}/betting/odds/override",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"match_id": match_id, "odds": odds})
    return resp

def bet_lock(match_id, bet_type, locked, token):
    resp = requests.post(f"{BASE_URL}/betting/bet-lock",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"match_id": match_id, "bet_type": bet_type, "locked": locked})
    return resp

def create_coupon(items, stake, token):
    resp = requests.post(f"{BASE_URL}/betting/coupons",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"items": items, "stake": stake})
    return resp

def main():
    log("Testing odds override and bet lock...")
    
    # Login
    token = login_founder()
    log("✓ Logged in as founder")
    
    # Get teams
    teams = get_teams()
    if len(teams) < 2:
        log("ERROR: Need at least 2 teams")
        return
    
    home_id = teams[0]["id"]
    away_id = teams[1]["id"]
    
    # Create exhibition match
    log(f"\n--- Creating exhibition match: {teams[0]['name']} vs {teams[1]['name']} ---")
    resp = create_exhibition(home_id, away_id, token)
    if resp.status_code != 200:
        log(f"ERROR: Create exhibition failed: {resp.status_code} {resp.text}")
        return
    
    match = resp.json()
    match_id = match["id"]
    log(f"✓ Exhibition match created: {match_id}")
    
    # Generate odds
    log("\n--- Generating odds ---")
    resp = generate_odds(match_id, token)
    if resp.status_code != 200:
        log(f"ERROR: Generate odds failed: {resp.status_code} {resp.text}")
        return
    
    odds_data = resp.json()
    log(f"✓ Odds generated: {json.dumps(odds_data['odds'], indent=2)}")
    
    # TEST: Odds override
    log("\n--- TEST: Odds Override ---")
    new_odds = {
        "ms_1": 1.5,
        "ms_x": 3.5,
        "goal_over_2_5": 2.0
    }
    
    resp = override_odds(match_id, new_odds, token)
    if resp.status_code != 200:
        log(f"ERROR: Override odds failed: {resp.status_code} {resp.text}")
        return
    
    result = resp.json()
    log(f"✓ Odds overridden: {json.dumps(result['odds'], indent=2)}")
    
    # Verify
    for key, value in new_odds.items():
        if result["odds"].get(key) != value:
            log(f"ERROR: Override failed for {key}: expected {value}, got {result['odds'].get(key)}")
            return
    
    log("✓ All overridden odds values correct")
    
    # Test out-of-range rejection
    log("\n--- Testing out-of-range odds rejection ---")
    bad_odds = {"ms_1": 0.5}  # < 1.05
    resp = override_odds(match_id, bad_odds, token)
    if resp.status_code == 200:
        result = resp.json()
        if result["odds"]["ms_1"] == 0.5:
            log("ERROR: Should reject odds < 1.05")
            return
        log("✓ Correctly ignored out-of-range odds value")
    
    log("✅ ODDS OVERRIDE TEST PASSED")
    
    # TEST: Bet lock
    log("\n--- TEST: Bet Lock ---")
    
    # Lock CORNER_O_U
    resp = bet_lock(match_id, "CORNER_O_U", True, token)
    if resp.status_code != 200:
        log(f"ERROR: Bet lock failed: {resp.status_code} {resp.text}")
        return
    
    result = resp.json()
    log(f"✓ Bet locks: {result['bet_locks']}")
    
    if not result["bet_locks"].get("CORNER_O_U"):
        log("ERROR: CORNER_O_U should be locked")
        return
    
    log("✓ CORNER_O_U locked successfully")
    
    # Try to create coupon with locked bet type (should fail)
    log("\n--- Trying to create coupon with locked bet type (should fail) ---")
    items = [{"match_id": match_id, "bet_type": "CORNER_O_U", "selection": "OVER_4_5"}]
    resp = create_coupon(items, 50, token)
    if resp.status_code == 400:
        log(f"✓ Correctly rejected locked bet type: {resp.json()}")
    else:
        log(f"ERROR: Should reject locked bet type, got {resp.status_code}")
        return
    
    # Unlock
    log("\n--- Unlocking CORNER_O_U ---")
    resp = bet_lock(match_id, "CORNER_O_U", False, token)
    if resp.status_code != 200:
        log(f"ERROR: Bet unlock failed: {resp.status_code} {resp.text}")
        return
    
    result = resp.json()
    if result["bet_locks"].get("CORNER_O_U"):
        log("ERROR: CORNER_O_U should be unlocked")
        return
    
    log("✓ CORNER_O_U unlocked successfully")
    
    # Now coupon should work
    log("\n--- Creating coupon with unlocked bet type (should succeed) ---")
    resp = create_coupon(items, 50, token)
    if resp.status_code == 200:
        log("✓ Coupon created successfully after unlock")
    else:
        log(f"ERROR: Coupon creation failed: {resp.status_code} {resp.text}")
        return
    
    log("✅ BET LOCK TEST PASSED")
    
    log("\n" + "="*70)
    log("✅ ALL REMAINING TESTS PASSED!")
    log("="*70)

if __name__ == "__main__":
    main()
