#!/usr/bin/env python3
"""
Test cup finish with corners support
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

def delete_tournament(token):
    resp = requests.delete(f"{BASE_URL}/admin/tournament",
                          headers={"Authorization": f"Bearer {token}"})
    return resp

def create_tournament(name, mode, token):
    resp = requests.post(f"{BASE_URL}/admin/tournament",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "name": name,
                            "weeks": 3,
                            "cover_url": "",
                            "mode": mode
                        })
    return resp

def draw_cup(token):
    resp = requests.post(f"{BASE_URL}/admin/cup/draw",
                        headers={"Authorization": f"Bearer {token}"})
    return resp

def get_cup_bracket():
    resp = requests.get(f"{BASE_URL}/cup/bracket")
    return resp.json()

def get_cup_matches():
    resp = requests.get(f"{BASE_URL}/cup/matches")
    return resp.json()

def generate_odds(match_id, token):
    resp = requests.post(f"{BASE_URL}/betting/odds/generate/{match_id}",
                        headers={"Authorization": f"Bearer {token}"})
    return resp

def create_coupon(items, stake, token):
    resp = requests.post(f"{BASE_URL}/betting/coupons",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"items": items, "stake": stake})
    return resp

def start_cup_match(match_id, token):
    resp = requests.post(f"{BASE_URL}/admin/cup/match/{match_id}/start",
                        headers={"Authorization": f"Bearer {token}"})
    return resp

def finish_cup_match(match_id, home_score, away_score, home_corners, away_corners, token):
    payload = {
        "home_score": home_score,
        "away_score": away_score
    }
    if home_corners is not None:
        payload["home_corners"] = home_corners
    if away_corners is not None:
        payload["away_corners"] = away_corners
    
    resp = requests.post(f"{BASE_URL}/admin/cup/match/{match_id}/result",
                        headers={"Authorization": f"Bearer {token}"},
                        json=payload)
    return resp

def get_founder_coupons(token):
    resp = requests.get(f"{BASE_URL}/betting/founder/coupons?limit=100",
                       headers={"Authorization": f"Bearer {token}"})
    return resp.json()

def main():
    log("Testing cup finish with corners support...")
    
    # Login
    token = login_founder()
    log("✓ Logged in as founder")
    
    # Get teams
    teams = get_teams()
    if len(teams) < 2:
        log("ERROR: Need at least 2 teams")
        return
    
    log(f"Found {len(teams)} teams")
    
    # Delete existing tournament
    log("\n--- Deleting existing tournament ---")
    delete_tournament(token)
    log("✓ Tournament deleted")
    
    # Create cup tournament
    log("\n--- Creating cup tournament ---")
    resp = create_tournament("Test Cup Corners", "cup", token)
    if resp.status_code != 200:
        log(f"ERROR: Create tournament failed: {resp.status_code} {resp.text}")
        return
    
    tournament = resp.json()
    log(f"✓ Cup tournament created: {tournament['name']}")
    
    # Draw cup
    log("\n--- Drawing cup bracket ---")
    resp = draw_cup(token)
    if resp.status_code != 200:
        log(f"ERROR: Cup draw failed: {resp.status_code} {resp.text}")
        return
    
    log("✓ Cup drawn")
    
    # Get cup matches
    log("\n--- Getting cup matches ---")
    matches = get_cup_matches()
    log(f"Found {len(matches)} cup matches")
    
    # Find a non-bye scheduled match
    scheduled = [m for m in matches if m.get("status") == "scheduled" and not m.get("bye")]
    if not scheduled:
        log("ERROR: No scheduled non-bye matches found")
        return
    
    match = scheduled[0]
    match_id = match["id"]
    log(f"Selected match: {match['home']['name']} vs {match['away']['name']}")
    
    # Generate odds
    log("\n--- Generating odds for cup match ---")
    resp = generate_odds(match_id, token)
    if resp.status_code != 200:
        log(f"ERROR: Generate odds failed: {resp.status_code} {resp.text}")
        return
    
    odds_data = resp.json()
    log(f"✓ Odds generated")
    
    # Create coupon with CORNER_O_U bet
    log("\n--- Creating coupon with CORNER_O_U bet ---")
    items = [{"match_id": match_id, "bet_type": "CORNER_O_U", "selection": "OVER_4_5"}]
    resp = create_coupon(items, 50, token)
    if resp.status_code != 200:
        log(f"ERROR: Create coupon failed: {resp.status_code} {resp.text}")
        return
    
    coupon = resp.json()
    coupon_id = coupon["id"]
    log(f"✓ Coupon created: {coupon_id}")
    log(f"  Bet: CORNER_O_U OVER_4_5, Stake: 50, Potential: {coupon['potential_payout']}")
    
    # Start match
    log("\n--- Starting cup match ---")
    resp = start_cup_match(match_id, token)
    if resp.status_code != 200:
        log(f"ERROR: Start match failed: {resp.status_code} {resp.text}")
        return
    
    log("✓ Match started")
    
    # Finish match with corners
    log("\n--- Finishing cup match with corners ---")
    home_score = 2
    away_score = 1
    home_corners = 7
    away_corners = 4
    
    resp = finish_cup_match(match_id, home_score, away_score, home_corners, away_corners, token)
    if resp.status_code != 200:
        log(f"ERROR: Finish match failed: {resp.status_code} {resp.text}")
        return
    
    result = resp.json()
    log(f"✓ Match finished: {home_score}-{away_score}, corners: {home_corners}-{away_corners}")
    log(f"  Winner: {result.get('winner_team_id')}")
    
    # Verify coupon settlement
    log("\n--- Verifying coupon settlement ---")
    import time
    time.sleep(2)  # Wait for settlement
    
    coupons = get_founder_coupons(token)
    coupon = next((c for c in coupons if c["id"] == coupon_id), None)
    
    if not coupon:
        log("ERROR: Coupon not found")
        return
    
    log(f"Coupon status: {coupon['status']}")
    
    # Total corners = 7 + 4 = 11 > 4.5 → OVER_4_5 should WIN
    total_corners = home_corners + away_corners
    log(f"Total corners: {total_corners} (>4.5 means OVER_4_5 wins)")
    
    if coupon["status"] == "WON":
        log(f"✓ Coupon WON! Payout: {coupon.get('payout', 0)}")
        log("✓ CORNER_O_U settlement working correctly")
    elif coupon["status"] == "LOST":
        log("ERROR: Coupon should have WON (11 corners > 4.5)")
        return
    else:
        log(f"⚠ Coupon status: {coupon['status']}")
    
    # Verify corners in match data
    log("\n--- Verifying corners in cup match data ---")
    matches_after = get_cup_matches()
    match_after = next((m for m in matches_after if m["id"] == match_id), None)
    
    if not match_after:
        log("ERROR: Match not found after finish")
        return
    
    if match_after.get("home_corners") != home_corners:
        log(f"ERROR: Home corners mismatch: expected {home_corners}, got {match_after.get('home_corners')}")
        return
    
    if match_after.get("away_corners") != away_corners:
        log(f"ERROR: Away corners mismatch: expected {away_corners}, got {match_after.get('away_corners')}")
        return
    
    log(f"✓ Corners stored correctly in match: {match_after['home_corners']}-{match_after['away_corners']}")
    
    log("\n" + "="*70)
    log("✅ CUP CORNERS TEST PASSED!")
    log("="*70)

if __name__ == "__main__":
    main()
