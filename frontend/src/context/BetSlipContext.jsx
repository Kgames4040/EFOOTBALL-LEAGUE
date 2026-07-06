import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const BetSlipContext = createContext(null);

const LS_KEY = "bet_slip_v1";

function loadInitial() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { items: [], stake: 100 };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return { items: [], stake: 100 };
    return parsed;
  } catch { return { items: [], stake: 100 }; }
}

export function BetSlipProvider({ children }) {
  const [items, setItems] = useState(() => loadInitial().items);
  const [stake, setStake] = useState(() => loadInitial().stake);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(null); // coupon object once played

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ items, stake })); } catch { /* ignore */ }
  }, [items, stake]);

  const addOrReplace = useCallback((item) => {
    setItems((prev) => {
      const others = prev.filter((p) => p.match_id !== item.match_id);
      return [...others, item];
    });
  }, []);

  const remove = useCallback((matchId) => {
    setItems((prev) => prev.filter((p) => p.match_id !== matchId));
  }, []);

  const clear = useCallback(() => { setItems([]); setStake(100); }, []);

  const totalOdd = useMemo(() => items.reduce((acc, it) => acc * (Number(it.odd) || 1), 1), [items]);
  const potentialPayout = useMemo(() => Math.round(stake * totalOdd), [stake, totalOdd]);

  const isSelected = useCallback((matchId, betType, selection) => {
    const it = items.find((p) => p.match_id === matchId);
    if (!it) return false;
    return it.bet_type === betType && it.selection === selection;
  }, [items]);

  const value = { items, stake, setStake, addOrReplace, remove, clear, totalOdd, potentialPayout, isSelected, open, setOpen, confirmed, setConfirmed };
  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

export const useBetSlip = () => {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used inside BetSlipProvider");
  return ctx;
};
