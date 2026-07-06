import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Zap, Users, Ticket, Lock, Unlock, RefreshCw, XCircle, Sparkles, CheckCircle2, DollarSign, TrendingUp, Activity } from "lucide-react";
import { CoinIcon, CoinAmount } from "./CoinIcon";
import {
  generateOdds, overrideOdds, toggleBetLock,
  founderCoupons, founderUsers, founderStats,
  founderSetPoints, founderCancelCoupon, founderSetCouponStatus,
  BET_TYPE_LABEL, SELECTION_LABEL, ODDS_KEY,
} from "../lib/betting";
import api from "../lib/api";
import "../betting.css";



function StatCard({ icon: Icon, label, value, color = "var(--btg-primary-soft)" }) {
  return (
    <div className="btg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider text-[color:var(--btg-muted)] font-bold">{label}</span>
      </div>
      <div className="btg-num text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

function OddsEditor({ match, onDone }) {
  const [odds, setOdds] = useState(match.odds || {});
  const [busy, setBusy] = useState(false);

  const gen = async () => {
    setBusy(true);
    try {
      const r = await generateOdds(match.id);
      setOdds(r.odds);
      toast.success("AI oranları üretildi");
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
    finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await overrideOdds(match.id, odds);
      setOdds(r.odds);
      toast.success("Oranlar güncellendi");
      onDone?.();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
    finally { setBusy(false); }
  };

  return (
    <div className="btg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm truncate">{match.home?.name} vs {match.away?.name}</div>
        <span className="text-[10px] text-[color:var(--btg-muted)]">H{match.week || "?"}</span>
      </div>
      
      <div className="space-y-4 mb-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {Object.keys(ODDS_KEY).map(betType => (
           <div key={betType}>
              <div className="flex justify-between items-center mb-1">
                 <div className="text-[11px] font-bold text-[color:var(--btg-primary-soft)]">{BET_TYPE_LABEL[betType]}</div>
                 <button type="button" className={`text-[10px] px-2 py-0.5 rounded border ${match.bet_locks?.[betType] ? "bg-red-900/30 border-red-800 text-red-200" : "bg-[color:var(--btg-surface)] border-[color:var(--btg-border)]"}`} onClick={async () => {
                   await toggleBetLock(match.id, betType, !match.bet_locks?.[betType]);
                   onDone?.();
                 }}>
                   {match.bet_locks?.[betType] ? "Grup Kilitli" : "Grup Kilitle"}
                 </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                 {Object.keys(ODDS_KEY[betType]).map(sel => {
                    const k = ODDS_KEY[betType][sel];
                    const isLocked = match.bet_locks?.[sel];
                    return (
                      <div key={sel} className="relative">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[10px] text-[color:var(--btg-muted)] font-bold truncate pr-1">{SELECTION_LABEL[sel]}</span>
                          <button type="button" onClick={async () => {
                             await toggleBetLock(match.id, sel, !isLocked);
                             onDone?.();
                          }}>
                             {isLocked ? <Lock className="w-3 h-3 text-red-400" /> : <Unlock className="w-3 h-3 text-[color:var(--btg-muted)] opacity-50 hover:opacity-100" />}
                          </button>
                        </div>
                        <input
                          type="number" step="0.01" min="1.01"
                          value={odds?.[k] ?? ""}
                          onChange={(e) => setOdds({ ...odds, [k]: parseFloat(e.target.value) || 0 })}
                          className={`w-full bg-[color:var(--btg-surface)] border ${isLocked ? 'border-red-900/50 opacity-50 text-red-200' : 'border-[color:var(--btg-border)]'} rounded-lg px-2 py-1 text-xs btg-num focus:outline-none focus:border-[color:var(--btg-primary)]`}
                        />
                      </div>
                    )
                 })}
              </div>
           </div>
        ))}
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={gen} disabled={busy} className="btg-pill flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> AI Üret</button>
        <button type="button" onClick={save} disabled={busy} className="btg-cta text-xs px-4 py-1.5 ml-auto">Kaydet</button>
      </div>
    </div>
  );
}

function UsersTable({ users, onEdit }) {
  if (users.length === 0) return <div className="text-[color:var(--btg-muted)] text-center py-6">Kullanıcı yok</div>;
  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="btg-card p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm truncate">{u.username} <span className="text-[10px] text-[color:var(--btg-muted)]">({u.role})</span></div>
            <div className="text-[10px] text-[color:var(--btg-muted)]">K:{u.stats.total_coupons} • W:{u.stats.won} • L:{u.stats.lost} • P:{u.stats.pending} • Yatırılan: {u.stats.total_staked} • Kazandı: {u.stats.total_won}</div>
          </div>
          <div className="flex items-center gap-2">
            <CoinAmount amount={u.points || 0} size={16} />
            <button type="button" onClick={() => onEdit(u)} className="btg-tab text-[10px]">Düzenle</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [delta, setDelta] = useState(0);
  const [setTo, setSetTo] = useState(user.points || 0);
  const [mode, setMode] = useState("delta");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const payload = mode === "delta" ? { delta: parseInt(delta, 10) } : { set_to: parseInt(setTo, 10) };
      const r = await founderSetPoints(user.id, payload);
      toast.success(`${user.username} bakiyesi ${r.points} coin`);
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="betting-scope w-full max-w-sm btg-card p-5 btg-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Kullanıcı Bakiyesi</div>
        <div className="text-xl font-black mb-3">{user.username}</div>
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setMode("delta")} className={`btg-tab flex-1 ${mode === "delta" ? "active" : ""}`}>Ekle/Azılt</button>
          <button type="button" onClick={() => setMode("set")} className={`btg-tab flex-1 ${mode === "set" ? "active" : ""}`}>Ayarla</button>
        </div>
        {mode === "delta" ? (
          <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="Örn: +100 veya -50" className="w-full bg-[color:var(--btg-surface)] border border-[color:var(--btg-border)] rounded-xl px-3 py-2 mb-3 btg-num" />
        ) : (
          <input type="number" value={setTo} onChange={(e) => setSetTo(e.target.value)} placeholder="Yeni bakiye" className="w-full bg-[color:var(--btg-surface)] border border-[color:var(--btg-border)] rounded-xl px-3 py-2 mb-3 btg-num" />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 btg-tab">İptal</button>
          <button type="button" onClick={save} disabled={busy} className="flex-1 btg-cta text-sm">Kaydet</button>
        </div>
      </div>
    </div>
  );
}

function CouponRow({ c, onCancel, onSetStatus }) {
  const statusClass = c.status === "WON" ? "badge-won" : c.status === "LOST" ? "badge-lost" : c.status === "REFUNDED" ? "badge-refunded" : "badge-pending";
  return (
    <div className="btg-card p-3 mb-2">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold">{c.username}</span>
          <span className={`btg-badge ${statusClass}`}>{c.status}</span>
          <span className="text-[10px] text-[color:var(--btg-muted)]">{c.items.length} maç</span>
        </div>
        <div className="flex items-center gap-2">
          <CoinAmount amount={c.stake} size={14} className="text-xs text-[color:var(--btg-primary-soft)]" />
          <span className="btg-num text-xs text-[color:var(--btg-accent)]">@{Number(c.total_odd).toFixed(2)}</span>
          <CoinAmount amount={c.status === "WON" ? (c.payout || 0) : c.potential_payout} size={14} className="text-xs" />
        </div>
      </div>
      <div className="space-y-0.5 text-[11px]">
        {c.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="truncate">{it.match?.home?.name} - {it.match?.away?.name}</span>
            <span className="text-[color:var(--btg-muted)] shrink-0">{BET_TYPE_LABEL[it.bet_type]} • <span className="text-[color:var(--btg-primary-soft)]">{SELECTION_LABEL[it.selection]}</span> @{Number(it.odd).toFixed(2)} {it.status === "WON" ? "✓" : it.status === "LOST" ? "✕" : "..."}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <button type="button" onClick={() => onSetStatus(c.id, "WON")} className="btg-tab text-[10px]">Zorla KAZAN</button>
        <button type="button" onClick={() => onSetStatus(c.id, "LOST")} className="btg-tab text-[10px]">Zorla KAYBET</button>
        <button type="button" onClick={() => onSetStatus(c.id, "PENDING")} className="btg-tab text-[10px]">Bekliyor</button>
        <button type="button" onClick={() => onCancel(c.id)} className="btg-tab text-[10px] ml-auto" style={{ color: "#ff8f9c" }}>İptal + İade</button>
      </div>
    </div>
  );
}

export default function BettingAdminPanel() {
  const [subTab, setSubTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [matches, setMatches] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const reload = () => setRefreshTick((t) => t + 1);

  useEffect(() => {
    (async () => {
      try {
        if (subTab === "stats") { setStats(await founderStats()); }
        if (subTab === "users") { setUsers(await founderUsers()); }
        if (subTab === "coupons") { setCoupons(await founderCoupons({ limit: 200 })); }
        if (subTab === "odds") {
          const [m, cup, ex] = await Promise.all([
            api.get("/matches").catch(() => ({ data: [] })),
            api.get("/cup/matches").catch(() => ({ data: [] })),
            api.get("/exhibition-matches").catch(() => ({ data: [] })),
          ]);
          const all = [...(m.data || []), ...(cup.data || []), ...(ex.data || [])].filter((x) => x.status === "scheduled");
          setMatches(all);
        }
      } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
    })();
  }, [subTab, refreshTick]);

  return (
    <div className="betting-scope" style={{ background: "radial-gradient(600px 300px at 30% 0%, rgba(0,242,234,0.15), transparent 60%), #0b0e11", padding: "16px", borderRadius: 16 }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase text-[color:var(--btg-muted)] tracking-widest font-bold">Kurucu / Bahis Yönetimi</div>
          <h2 className="text-2xl font-black flex items-center gap-2"><Zap className="w-6 h-6 text-[color:var(--btg-accent)]" /> BAHİS KONSOLU</h2>
        </div>
        <button type="button" onClick={reload} className="btg-pill flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Yenile</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" onClick={() => setSubTab("stats")} className={`btg-tab ${subTab === "stats" ? "active" : ""}`}><Activity className="inline w-3.5 h-3.5 mr-1" /> İstatistik</button>
        <button type="button" onClick={() => setSubTab("users")} className={`btg-tab ${subTab === "users" ? "active" : ""}`}><Users className="inline w-3.5 h-3.5 mr-1" /> Kullanıcılar</button>
        <button type="button" onClick={() => setSubTab("coupons")} className={`btg-tab ${subTab === "coupons" ? "active" : ""}`}><Ticket className="inline w-3.5 h-3.5 mr-1" /> Kuponlar</button>
        <button type="button" onClick={() => setSubTab("odds")} className={`btg-tab ${subTab === "odds" ? "active" : ""}`}><TrendingUp className="inline w-3.5 h-3.5 mr-1" /> Oranlar & Kilit</button>
      </div>

      {subTab === "stats" && stats && (
        <div>
          <div className="text-[10px] uppercase text-[color:var(--btg-muted)] tracking-wider font-bold mb-2">Bugün</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard icon={Ticket} label="Kupon" value={stats.today.count} />
            <StatCard icon={DollarSign} label="Harcanan" value={stats.today.staked} color="#c3f400" />
            <StatCard icon={TrendingUp} label="Kazanılan" value={stats.today.won} color="#c3f400" />
          </div>
          <div className="text-[10px] uppercase text-[color:var(--btg-muted)] tracking-wider font-bold mb-2">Tüm Zamanlar</div>
          <div className="grid grid-cols-4 gap-2">
            <StatCard icon={Ticket} label="Kupon" value={stats.all_time.count} />
            <StatCard icon={DollarSign} label="Harcanan" value={stats.all_time.staked} color="#c3f400" />
            <StatCard icon={TrendingUp} label="Kazanılan" value={stats.all_time.won} color="#c3f400" />
            <StatCard icon={CoinIcon} label="Piyasada" value={stats.total_points_in_circulation} color="var(--btg-primary-soft)" />
          </div>
        </div>
      )}

      {subTab === "users" && (
        <UsersTable users={users} onEdit={setEditingUser} />
      )}

      {subTab === "coupons" && (
        coupons.length === 0 ? <div className="text-[color:var(--btg-muted)] text-center py-6">Kupon yok</div>
        : coupons.map((c) => (
          <CouponRow key={c.id} c={c}
            onCancel={async (id) => {
              if (!window.confirm("Kuponu iptal et ve iade et?")) return;
              try { await founderCancelCoupon(id); toast.success("İade edildi"); reload(); }
              catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
            }}
            onSetStatus={async (id, s) => {
              try { await founderSetCouponStatus(id, s); toast.success(`Durum: ${s}`); reload(); }
              catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
            }} />
        ))
      )}

      {subTab === "odds" && (
        <div className="space-y-3">
          {matches.length === 0 && <div className="text-[color:var(--btg-muted)] text-center py-6">Planlanmış maç yok</div>}
          {matches.map((m) => <OddsEditor key={m.id} match={m} onDone={reload} />)}
        </div>
      )}

      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={() => { setEditingUser(null); reload(); }} />}
    </div>
  );
}
