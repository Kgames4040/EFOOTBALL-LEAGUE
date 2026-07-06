import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Search, Lock, Sparkles, ShieldQuestion, X } from "lucide-react";
import { useBetSlip } from "../context/BetSlipContext";
import { CoinIcon, CoinAmount } from "./CoinIcon";
import { BET_TYPE_LABEL, SELECTION_LABEL, SELECTION_SHORT, getOdd, getWallet, createCoupon, MIN_STAKE } from "../lib/betting";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import H2HModal from "./H2HModal";
import "../betting.css";

function OddButton({ label, odd, active, disabled, onClick, hint }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`btg-odd-btn text-left ${active ? "active" : ""}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-wider text-[color:var(--btg-muted)] font-semibold">{label}</span>
        {disabled && <Lock className="w-3.5 h-3.5 text-[color:var(--btg-muted)]" />}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-black tracking-tight" style={{ color: active ? "#c3f400" : "var(--btg-primary-soft)" }}>
          {odd != null ? Number(odd).toFixed(2) : "—"}
        </span>
      </div>
      {hint && <div className="text-[10px] mt-1 text-[color:var(--btg-muted)]">{hint}</div>}
    </button>
  );
}

function MatchBettingCard({ match, onSelect, isSelected, onOpenH2H }) {
  const { odds, bet_locks: locks = {}, status } = match;
  const hasOdds = !!odds;
  const bettable = status === "scheduled" && hasOdds;
  const homeName = match.home?.name || match.home?.abbreviation || "?";
  const awayName = match.away?.name || match.away?.abbreviation || "?";

  return (
    <div className="btg-card p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="btg-pill">{match.mode === "cup" ? "KUPA" : `HAFTA ${match.week || "?"}`}</span>
          {match.scheduled_time && (
            <span className="text-[11px] text-[color:var(--btg-muted)] truncate">{match.scheduled_time}</span>
          )}
        </div>
        <button type="button" onClick={onOpenH2H} className="text-[color:var(--btg-primary-soft)] hover:text-[color:var(--btg-accent)] flex items-center gap-1 text-[11px] font-semibold">
          <ShieldQuestion className="w-3.5 h-3.5" /> H2H
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {match.home?.logo_url && <img src={match.home.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
          <div className="truncate">
            <div className="text-sm font-bold truncate">{homeName}</div>
            <div className="text-[10px] text-[color:var(--btg-muted)]">EV</div>
          </div>
        </div>
        <div className="text-center">
          <div className="btg-num text-lg">VS</div>
        </div>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <div className="truncate text-right">
            <div className="text-sm font-bold truncate">{awayName}</div>
            <div className="text-[10px] text-[color:var(--btg-muted)]">DEP</div>
          </div>
          {match.away?.logo_url && <img src={match.away.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
        </div>
      </div>

      {!bettable && (
        <div className="text-center text-[11px] text-[color:var(--btg-muted)] py-3 border border-dashed border-[color:var(--btg-border)] rounded-xl">
          {status !== "scheduled" ? "Bahis kapalı (maç başladı / bitti / iptal)" : "Oranlar henüz oluşturulmadı"}
        </div>
      )}
      {bettable && (
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--btg-muted)] mb-1 font-bold">Maç Sonucu</div>
            <div className="odds-grid-3">
              <OddButton label="1" odd={getOdd(odds, "MS", "1")} active={isSelected(match.id, "MS", "1")} disabled={locks.MS} onClick={() => onSelect(match, "MS", "1")} />
              <OddButton label="X" odd={getOdd(odds, "MS", "X")} active={isSelected(match.id, "MS", "X")} disabled={locks.MS} onClick={() => onSelect(match, "MS", "X")} />
              <OddButton label="2" odd={getOdd(odds, "MS", "2")} active={isSelected(match.id, "MS", "2")} disabled={locks.MS} onClick={() => onSelect(match, "MS", "2")} />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--btg-muted)] mb-1 font-bold">Gol Alt / Üst (2.5)</div>
            <div className="odds-grid-2">
              <OddButton label="Üst 2.5" odd={getOdd(odds, "GOAL_O_U", "OVER_2_5")} active={isSelected(match.id, "GOAL_O_U", "OVER_2_5")} disabled={locks.GOAL_O_U} onClick={() => onSelect(match, "GOAL_O_U", "OVER_2_5")} />
              <OddButton label="Alt 2.5" odd={getOdd(odds, "GOAL_O_U", "UNDER_2_5")} active={isSelected(match.id, "GOAL_O_U", "UNDER_2_5")} disabled={locks.GOAL_O_U} onClick={() => onSelect(match, "GOAL_O_U", "UNDER_2_5")} />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--btg-muted)] mb-1 font-bold">Korner Alt / Üst (4.5)</div>
            <div className="odds-grid-2">
              <OddButton label="K.Üst 4.5" odd={getOdd(odds, "CORNER_O_U", "OVER_4_5")} active={isSelected(match.id, "CORNER_O_U", "OVER_4_5")} disabled={locks.CORNER_O_U} onClick={() => onSelect(match, "CORNER_O_U", "OVER_4_5")} />
              <OddButton label="K.Alt 4.5" odd={getOdd(odds, "CORNER_O_U", "UNDER_4_5")} active={isSelected(match.id, "CORNER_O_U", "UNDER_4_5")} disabled={locks.CORNER_O_U} onClick={() => onSelect(match, "CORNER_O_U", "UNDER_4_5")} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BetSlipBar({ onOpen, wallet }) {
  const { items, potentialPayout } = useBetSlip();
  if (items.length === 0) return null;
  return (
    <div className="btg-slip-bar fixed bottom-0 inset-x-0 z-40 px-3 py-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 12px)" }}>
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Kupon</div>
          <div className="text-sm font-bold flex items-center gap-2">
            <span className="text-[color:var(--btg-primary-soft)]">{items.length}</span>
            <span className="text-[color:var(--btg-muted)] text-xs">seçim</span>
            <span className="mx-1 text-[color:var(--btg-muted)]">•</span>
            <CoinAmount amount={potentialPayout} size={14} className="text-[color:var(--btg-accent)] text-xs" />
          </div>
        </div>
        <button type="button" onClick={onOpen} className="btg-cta text-sm px-5 py-2.5">
          KUPON ÖZETİ
        </button>
      </div>
    </div>
  );
}

function QuickAmount({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="btg-tab text-[11px]">{label}</button>
  );
}

export function BetSlipModal({ wallet, onPlayed, onClose }) {
  const { items, stake, setStake, remove, clear, totalOdd, potentialPayout } = useBetSlip();
  const [busy, setBusy] = useState(false);

  const canPlay = stake >= MIN_STAKE && items.length > 0 && stake <= wallet;

  const submit = async () => {
    if (!canPlay) return;
    setBusy(true);
    try {
      const payload = items.map((it) => ({ match_id: it.match_id, bet_type: it.bet_type, selection: it.selection }));
      const coupon = await createCoupon(payload, stake);
      onPlayed(coupon);
      clear();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Kupon oynanamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="betting-scope w-full max-w-lg btg-card p-5 rounded-b-none sm:rounded-3xl btg-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Kupon Özeti</div>
            <div className="text-xl font-black">{items.length > 1 ? `${items.length} MAÇ KOMBİNE` : "TEK MAÇ"}</div>
          </div>
          <button type="button" onClick={onClose} className="text-[color:var(--btg-muted)] hover:text-white p-2"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-2 mb-4">
          {items.map((it, i) => (
            <div key={it.match_id} className="btg-card p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] text-[color:var(--btg-muted)] font-bold">MAÇ {i + 1}</span>
                <button type="button" onClick={() => remove(it.match_id)} className="text-[10px] text-[color:#ff8f9c] hover:text-[color:#ff5b6b]">Kaldır</button>
              </div>
              <div className="text-sm font-bold truncate">{it.home_name} <span className="text-[color:var(--btg-muted)] mx-1">vs</span> {it.away_name}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[11px] text-[color:var(--btg-muted)]">{BET_TYPE_LABEL[it.bet_type]} • <span className="text-[color:var(--btg-primary-soft)] font-bold">{SELECTION_LABEL[it.selection]}</span></div>
                <div className="btg-num text-lg text-[color:var(--btg-accent)]">{Number(it.odd).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="btg-card p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Toplam Oran</span>
            <span className="btg-num text-2xl text-[color:var(--btg-accent)]">{Number(totalOdd).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Bakiyen</span>
            <CoinAmount amount={wallet} size={16} />
          </div>
        </div>

        <div className="mb-2 text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Miktar</div>
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <CoinIcon size={20} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              min={MIN_STAKE}
              value={stake}
              onChange={(e) => setStake(Math.max(0, parseInt(e.target.value || "0", 10)))}
              className="w-full bg-[color:var(--btg-surface)] border border-[color:var(--btg-border)] rounded-xl pl-11 pr-3 py-3 text-xl font-black btg-num focus:outline-none focus:border-[color:var(--btg-primary)] transition"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <QuickAmount label="+30" onClick={() => setStake((s) => s + 30)} />
          <QuickAmount label="+50" onClick={() => setStake((s) => s + 50)} />
          <QuickAmount label="+100" onClick={() => setStake((s) => s + 100)} />
          <QuickAmount label="Tümünü Bas" onClick={() => setStake(wallet)} />
          <QuickAmount label="Sıfırla" onClick={() => setStake(MIN_STAKE)} />
        </div>

        {stake < MIN_STAKE && <div className="text-[11px] text-[#ff8f9c] mb-2">Minimum bahis {MIN_STAKE} coin</div>}
        {stake > wallet && <div className="text-[11px] text-[#ff8f9c] mb-2">Bakiye yetersiz</div>}

        <div className="btg-card p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Potansiyel Kazanç</span>
            <CoinAmount amount={potentialPayout} size={22} className="text-[color:var(--btg-accent)] text-2xl" />
          </div>
        </div>

        <button type="button" disabled={!canPlay || busy} onClick={submit} className="btg-cta w-full text-lg py-3.5">
          {busy ? "OYNANIYOR..." : "ŞİMDİ OYNA"}
        </button>
        <p className="text-[10px] text-center text-[color:var(--btg-muted)] mt-2">Oynanan kupon iptal edilemez. Kurucu iade edebilir.</p>
      </div>
    </div>
  );
}

export function CouponConfirmedModal({ coupon, onClose, onSeeMyCoupons }) {
  const confettiCount = 24;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="btg-confetti pointer-events-none">
        {Array.from({ length: confettiCount }).map((_, i) => (
          <i key={i} style={{ left: `${(i / confettiCount) * 100}%`, animationDelay: `${(i % 6) * 0.15}s`, color: i % 2 === 0 ? "#00f2ea" : "#c3f400" }}>
            {i % 3 === 0 ? "✦" : i % 3 === 1 ? "◆" : "⬢"}
          </i>
        ))}
      </div>
      <div className="betting-scope w-full max-w-md btg-card p-6 text-center btg-slide-up">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "radial-gradient(circle, #00f2ea44, transparent 70%)" }}>
          <Sparkles className="w-12 h-12 text-[color:var(--btg-accent)]" />
        </div>
        <div className="text-[10px] uppercase text-[color:var(--btg-muted)] tracking-wider font-bold">Kupon Onaylandı</div>
        <h2 className="font-black text-3xl mt-1 mb-4" style={{ color: "var(--btg-primary-soft)" }}>BİLETİN HAZIR!</h2>

        <div className="btg-card p-4 text-left mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Kupon ID</span>
            <span className="btg-num text-xs">{coupon.id.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Yatırılan</span>
            <CoinAmount amount={coupon.stake} size={16} />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Toplam Oran</span>
            <span className="btg-num text-lg text-[color:var(--btg-primary-soft)]">{Number(coupon.total_odd).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[color:var(--btg-border)] mt-2">
            <span className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Potansiyel</span>
            <CoinAmount amount={coupon.potential_payout} size={22} className="text-[color:var(--btg-accent)] text-2xl" />
          </div>
        </div>

        <button type="button" onClick={onSeeMyCoupons} className="btg-cta w-full mb-2">KUPONLARIM</button>
        <button type="button" onClick={onClose} className="w-full text-[color:var(--btg-muted)] hover:text-white text-sm py-2">Kapat</button>
      </div>
    </div>
  );
}

export default function BettingPanel({ onBack, onNavigateMyCoupons }) {
  const [matches, setMatches] = useState([]);
  const [wallet, setWallet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [h2h, setH2h] = useState(null); // { teamA, teamB }
  const [query, setQuery] = useState("");
  const { addOrReplace, isSelected, open, setOpen, confirmed, setConfirmed } = useBetSlip();

  const load = useCallback(async () => {
    try {
      const [m, cup, ex, w] = await Promise.all([
        api.get("/matches").catch(() => ({ data: [] })),
        api.get("/cup/matches").catch(() => ({ data: [] })),
        api.get("/exhibition-matches").catch(() => ({ data: [] })),
        getWallet().catch(() => 0),
      ]);
      const all = [...(m.data || []), ...(cup.data || []), ...(ex.data || [])];
      const scheduled = all.filter((x) => x.status === "scheduled");
      setMatches(scheduled);
      setWallet(w);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  const handleSelect = (match, betType, selection) => {
    const odd = getOdd(match.odds, betType, selection);
    if (odd == null) return;
    addOrReplace({
      match_id: match.id,
      bet_type: betType,
      selection,
      odd,
      home_name: match.home?.name || "?",
      away_name: match.away?.name || "?",
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      const hn = (m.home?.name || "").toLowerCase();
      const an = (m.away?.name || "").toLowerCase();
      return hn.includes(q) || an.includes(q);
    });
  }, [matches, query]);

  return (
    <div className="betting-scope min-h-screen" style={{ background: "radial-gradient(1200px 600px at 50% -10%, rgba(0,242,234,0.14), transparent 60%), #0b0e11" }}>
      <div className="max-w-2xl mx-auto p-4 pb-32">
        <div className="flex items-center justify-between mb-4 sticky top-0 z-30 py-3 backdrop-blur" style={{ background: "linear-gradient(180deg, rgba(11,14,17,0.9), rgba(11,14,17,0.6))" }}>
          <button type="button" onClick={onBack} className="btg-pill flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> ANA SAYFA
          </button>
          <div className="flex items-center gap-2">
            <span className="coin-chip"><CoinIcon size={22} /><span>{wallet.toLocaleString("tr-TR")}</span></span>
          </div>
        </div>

        <div className="btg-card p-4 mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[color:var(--btg-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Takım ara..."
              className="bg-transparent flex-1 outline-none text-sm placeholder:text-[color:var(--btg-muted)]"
            />
            <button type="button" onClick={onNavigateMyCoupons} className="btg-pill">KUPONLARIM</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[color:var(--btg-muted)]">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="btg-card p-8 text-center">
            <div className="text-2xl font-black">Aktif maç yok</div>
            <div className="text-sm text-[color:var(--btg-muted)] mt-2">Kurucu maçları planladığında ve oranlar üretildiğinde burada görüneceksin.</div>
          </div>
        ) : (
          filtered.map((match) => (
            <MatchBettingCard
              key={match.id}
              match={match}
              onSelect={handleSelect}
              isSelected={isSelected}
              onOpenH2H={() => setH2h({ a: match.home_team_id, b: match.away_team_id, names: [match.home?.name, match.away?.name] })}
            />
          ))
        )}
      </div>

      <BetSlipBar onOpen={() => setOpen(true)} wallet={wallet} />
      {open && <BetSlipModal wallet={wallet} onClose={() => setOpen(false)} onPlayed={(coupon) => { setOpen(false); setConfirmed(coupon); load(); }} />}
      {confirmed && <CouponConfirmedModal coupon={confirmed} onClose={() => setConfirmed(null)} onSeeMyCoupons={() => { setConfirmed(null); onNavigateMyCoupons(); }} />}
      {h2h && <H2HModal teamA={h2h.a} teamB={h2h.b} onClose={() => setH2h(null)} />}
    </div>
  );
}
