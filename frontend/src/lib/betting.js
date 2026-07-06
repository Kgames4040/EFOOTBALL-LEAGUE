import api from "./api";

export const COIN_ICON_URL = "https://customer-assets.emergentagent.com/job_be1f8c82-f3f9-45d4-90ca-fe2de53a3e08/artifacts/gq9w7dei_lig%20bahis%20pin.png";

export const BET_TYPE_LABEL = {
  MS: "Maç Sonucu",
  GOAL_O_U: "Gol Alt/Üst",
  TEAM_GOAL_O_U: "Taraf Gol Alt/Üst",
  CORNER_O_U: "Korner Alt/Üst",
};

export const SELECTION_LABEL = {
  "1": "Ev Sahibi (1)",
  X: "Beraberlik (X)",
  "2": "Deplasman (2)",
  OVER_1_5: "Üst 1.5", UNDER_1_5: "Alt 1.5",
  OVER_2_5: "Üst 2.5", UNDER_2_5: "Alt 2.5",
  OVER_3_5: "Üst 3.5", UNDER_3_5: "Alt 3.5",
  OVER_4_5: "Üst 4.5", UNDER_4_5: "Alt 4.5",
  HOME_OVER_0_5: "Ev Üst 0.5", HOME_UNDER_0_5: "Ev Alt 0.5",
  HOME_OVER_1_5: "Ev Üst 1.5", HOME_UNDER_1_5: "Ev Alt 1.5",
  HOME_OVER_2_5: "Ev Üst 2.5", HOME_UNDER_2_5: "Ev Alt 2.5",
  HOME_OVER_3_5: "Ev Üst 3.5", HOME_UNDER_3_5: "Ev Alt 3.5",
  AWAY_OVER_0_5: "Dep Üst 0.5", AWAY_UNDER_0_5: "Dep Alt 0.5",
  AWAY_OVER_1_5: "Dep Üst 1.5", AWAY_UNDER_1_5: "Dep Alt 1.5",
  AWAY_OVER_2_5: "Dep Üst 2.5", AWAY_UNDER_2_5: "Dep Alt 2.5",
  AWAY_OVER_3_5: "Dep Üst 3.5", AWAY_UNDER_3_5: "Dep Alt 3.5",
  OVER_7_5: "Korner Üst 7.5", UNDER_7_5: "Korner Alt 7.5",
  OVER_8_5: "Korner Üst 8.5", UNDER_8_5: "Korner Alt 8.5",
  OVER_9_5: "Korner Üst 9.5", UNDER_9_5: "Korner Alt 9.5",
  OVER_10_5: "Korner Üst 10.5", UNDER_10_5: "Korner Alt 10.5",
};

export const SELECTION_SHORT = {
  "1": "1", X: "X", "2": "2",
  OVER_1_5: "ÜST 1.5", UNDER_1_5: "ALT 1.5",
  OVER_2_5: "ÜST 2.5", UNDER_2_5: "ALT 2.5",
  OVER_3_5: "ÜST 3.5", UNDER_3_5: "ALT 3.5",
  OVER_4_5: "ÜST 4.5", UNDER_4_5: "ALT 4.5",
  HOME_OVER_0_5: "EV 0.5Ü", HOME_UNDER_0_5: "EV 0.5A",
  HOME_OVER_1_5: "EV 1.5Ü", HOME_UNDER_1_5: "EV 1.5A",
  HOME_OVER_2_5: "EV 2.5Ü", HOME_UNDER_2_5: "EV 2.5A",
  HOME_OVER_3_5: "EV 3.5Ü", HOME_UNDER_3_5: "EV 3.5A",
  AWAY_OVER_0_5: "DEP 0.5Ü", AWAY_UNDER_0_5: "DEP 0.5A",
  AWAY_OVER_1_5: "DEP 1.5Ü", AWAY_UNDER_1_5: "DEP 1.5A",
  AWAY_OVER_2_5: "DEP 2.5Ü", AWAY_UNDER_2_5: "DEP 2.5A",
  AWAY_OVER_3_5: "DEP 3.5Ü", AWAY_UNDER_3_5: "DEP 3.5A",
  OVER_7_5: "K.ÜST 7.5", UNDER_7_5: "K.ALT 7.5",
  OVER_8_5: "K.ÜST 8.5", UNDER_8_5: "K.ALT 8.5",
  OVER_9_5: "K.ÜST 9.5", UNDER_9_5: "K.ALT 9.5",
  OVER_10_5: "K.ÜST 10.5", UNDER_10_5: "K.ALT 10.5",
};

export const ODDS_KEY = {
  MS: { "1": "ms_1", X: "ms_x", "2": "ms_2" },
  GOAL_O_U: {
    OVER_1_5: "goal_over_1_5", UNDER_1_5: "goal_under_1_5",
    OVER_2_5: "goal_over_2_5", UNDER_2_5: "goal_under_2_5",
    OVER_3_5: "goal_over_3_5", UNDER_3_5: "goal_under_3_5",
    OVER_4_5: "goal_over_4_5", UNDER_4_5: "goal_under_4_5",
  },
  TEAM_GOAL_O_U: {
    HOME_OVER_0_5: "home_goal_over_0_5", HOME_UNDER_0_5: "home_goal_under_0_5",
    HOME_OVER_1_5: "home_goal_over_1_5", HOME_UNDER_1_5: "home_goal_under_1_5",
    HOME_OVER_2_5: "home_goal_over_2_5", HOME_UNDER_2_5: "home_goal_under_2_5",
    HOME_OVER_3_5: "home_goal_over_3_5", HOME_UNDER_3_5: "home_goal_under_3_5",
    AWAY_OVER_0_5: "away_goal_over_0_5", AWAY_UNDER_0_5: "away_goal_under_0_5",
    AWAY_OVER_1_5: "away_goal_over_1_5", AWAY_UNDER_1_5: "away_goal_under_1_5",
    AWAY_OVER_2_5: "away_goal_over_2_5", AWAY_UNDER_2_5: "away_goal_under_2_5",
    AWAY_OVER_3_5: "away_goal_over_3_5", AWAY_UNDER_3_5: "away_goal_under_3_5",
  },
  CORNER_O_U: {
    OVER_7_5: "corner_over_7_5", UNDER_7_5: "corner_under_7_5",
    OVER_8_5: "corner_over_8_5", UNDER_8_5: "corner_under_8_5",
    OVER_9_5: "corner_over_9_5", UNDER_9_5: "corner_under_9_5",
    OVER_10_5: "corner_over_10_5", UNDER_10_5: "corner_under_10_5",
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

export function isLocked(locks, betType, selection) {
  if (!locks) return false;
  const k = ODDS_KEY[betType]?.[selection];
  return !!locks[k];
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

export async function toggleBetLock(matchId, oddsKey, locked) {
  const { data } = await api.post("/betting/bet-lock", { match_id: matchId, odds_key: oddsKey, locked });
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
