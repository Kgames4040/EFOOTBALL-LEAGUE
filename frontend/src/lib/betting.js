import api from "./api";

export const COIN_ICON_URL = "https://customer-assets.emergentagent.com/job_be1f8c82-f3f9-45d4-90ca-fe2de53a3e08/artifacts/gq9w7dei_lig%20bahis%20pin.png";

export const BET_TYPE_LABEL = {
  MS: "Maç Sonucu",
  GOAL_O_U: "Gol Alt/Üst 2.5",
  CORNER_O_U: "Korner Alt/Üst 4.5",
};

export const SELECTION_LABEL = {
  "1": "Ev Sahibi (1)",
  X: "Beraberlik (X)",
  "2": "Deplasman (2)",
  OVER_2_5: "Üst 2.5",
  UNDER_2_5: "Alt 2.5",
  OVER_4_5: "Korner Üst 4.5",
  UNDER_4_5: "Korner Alt 4.5",
};

export const SELECTION_SHORT = {
  "1": "1",
  X: "X",
  "2": "2",
  OVER_2_5: "ÜST 2.5",
  UNDER_2_5: "ALT 2.5",
  OVER_4_5: "K.ÜST 4.5",
  UNDER_4_5: "K.ALT 4.5",
};

export const ODDS_KEY = {
  MS: { "1": "ms_1", X: "ms_x", "2": "ms_2" },
  GOAL_O_U: { OVER_2_5: "goal_over_2_5", UNDER_2_5: "goal_under_2_5" },
  CORNER_O_U: { OVER_4_5: "corner_over_4_5", UNDER_4_5: "corner_under_4_5" },
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
