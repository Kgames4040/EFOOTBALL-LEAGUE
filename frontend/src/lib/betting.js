import api from "./api";

export const COIN_ICON_URL = "https://i.ibb.co/JjbycYyb/Gemini-Generated-mage-ypuyveypuyveypuy-photoaidcom-cropped.png";

export const BET_TYPE_LABEL = {
  MS: "Maç Sonucu",
  GOAL: "Toplam Gol Alt/Üst",
  HOME_GOAL: "Ev Sahibi Gol Alt/Üst",
  AWAY_GOAL: "Deplasman Gol Alt/Üst",
  CORNER: "Korner Alt/Üst",
};

export const SELECTION_LABEL = {
  "1": "Ev Sahibi (1)", X: "Beraberlik (X)", "2": "Deplasman (2)",
  "0_5_U": "Alt 0.5", "0_5_O": "Üst 0.5",
  "1_5_U": "Alt 1.5", "1_5_O": "Üst 1.5",
  "2_5_U": "Alt 2.5", "2_5_O": "Üst 2.5",
  "3_5_U": "Alt 3.5", "3_5_O": "Üst 3.5",
  "4_5_U": "Alt 4.5", "4_5_O": "Üst 4.5",
  "7_5_U": "Alt 7.5", "7_5_O": "Üst 7.5",
  "8_5_U": "Alt 8.5", "8_5_O": "Üst 8.5",
  "9_5_U": "Alt 9.5", "9_5_O": "Üst 9.5",
  "10_5_U": "Alt 10.5", "10_5_O": "Üst 10.5",
};

export const SELECTION_SHORT = {
  "1": "1", X: "X", "2": "2",
  "0_5_U": "A 0.5", "0_5_O": "Ü 0.5",
  "1_5_U": "A 1.5", "1_5_O": "Ü 1.5",
  "2_5_U": "A 2.5", "2_5_O": "Ü 2.5",
  "3_5_U": "A 3.5", "3_5_O": "Ü 3.5",
  "4_5_U": "A 4.5", "4_5_O": "Ü 4.5",
  "7_5_U": "A 7.5", "7_5_O": "Ü 7.5",
  "8_5_U": "A 8.5", "8_5_O": "Ü 8.5",
  "9_5_U": "A 9.5", "9_5_O": "Ü 9.5",
  "10_5_U": "A 10.5", "10_5_O": "Ü 10.5",
};

export const ODDS_KEY = {
  MS: { "1": "ms_1", X: "ms_x", "2": "ms_2" },
  GOAL: {
    "1_5_U": "goal_1_5_u", "1_5_O": "goal_1_5_o",
    "2_5_U": "goal_2_5_u", "2_5_O": "goal_2_5_o",
    "3_5_U": "goal_3_5_u", "3_5_O": "goal_3_5_o",
    "4_5_U": "goal_4_5_u", "4_5_O": "goal_4_5_o",
  },
  HOME_GOAL: {
    "0_5_U": "home_goal_0_5_u", "0_5_O": "home_goal_0_5_o",
    "1_5_U": "home_goal_1_5_u", "1_5_O": "home_goal_1_5_o",
    "2_5_U": "home_goal_2_5_u", "2_5_O": "home_goal_2_5_o",
    "3_5_U": "home_goal_3_5_u", "3_5_O": "home_goal_3_5_o",
  },
  AWAY_GOAL: {
    "0_5_U": "away_goal_0_5_u", "0_5_O": "away_goal_0_5_o",
    "1_5_U": "away_goal_1_5_u", "1_5_O": "away_goal_1_5_o",
    "2_5_U": "away_goal_2_5_u", "2_5_O": "away_goal_2_5_o",
    "3_5_U": "away_goal_3_5_u", "3_5_O": "away_goal_3_5_o",
  },
  CORNER: {
    "7_5_U": "corner_7_5_u", "7_5_O": "corner_7_5_o",
    "8_5_U": "corner_8_5_u", "8_5_O": "corner_8_5_o",
    "9_5_U": "corner_9_5_u", "9_5_O": "corner_9_5_o",
    "10_5_U": "corner_10_5_u", "10_5_O": "corner_10_5_o",
  },
};

export const MIN_STAKE = 30;

export function getOdd(odds, betType, selection) {
  if (!odds) return null;
  const k = ODDS_KEY[betType]?.[selection];
  if (!k) return null;
  const v = odds[k];
  return typeof v === "number" ? v : null;
}

export async function getWallet() {
  const { data } = await api.get("/betting/wallet");
  return data.points;
}

export async function getMatchOdds(matchId) {
  const { data } = await api.get(`/betting/odds/${matchId}`);
  return data;
}

export async function generateOdds(matchId) {
  const { data } = await api.post(`/betting/odds/generate/${matchId}`);
  return data;
}

export async function overrideOdds(matchId, odds) {
  const { data } = await api.post("/betting/odds/override", { match_id: matchId, odds });
  return data;
}

export async function toggleBetLock(matchId, betType, locked) {
  const { data } = await api.post("/betting/bet-lock", { match_id: matchId, bet_type: betType, locked });
  return data;
}

export async function createCoupon(items, stake) {
  const { data } = await api.post("/betting/coupons", { items, stake });
  return data;
}

export async function getMyCoupons() {
  const { data } = await api.get("/betting/coupons/mine");
  return data;
}

export async function getH2H(teamA, teamB) {
  const { data } = await api.get(`/betting/h2h/${teamA}/${teamB}`);
  return data;
}

export async function founderCoupons(params = {}) {
  const { data } = await api.get("/betting/founder/coupons", { params });
  return data;
}

export async function founderUsers() {
  const { data } = await api.get("/betting/founder/users");
  return data;
}

export async function founderStats() {
  const { data } = await api.get("/betting/founder/stats");
  return data;
}

export async function founderSetPoints(userId, payload) {
  const { data } = await api.post(`/betting/founder/users/${userId}/points`, payload);
  return data;
}

export async function founderCancelCoupon(couponId) {
  const { data } = await api.post(`/betting/founder/coupons/${couponId}/cancel`);
  return data;
}

export async function founderSetCouponStatus(couponId, status) {
  const { data } = await api.post(`/betting/founder/coupons/${couponId}/set-status`, { status });
  return data;
}
