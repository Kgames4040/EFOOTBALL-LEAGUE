import React, { useEffect, useState } from "react";
import { ArrowLeft, Ticket, Trophy, XCircle, Clock, RefreshCw } from "lucide-react";
import { CoinIcon, CoinAmount } from "./CoinIcon";
import { BET_TYPE_LABEL, SELECTION_LABEL, getMyCoupons, getWallet } from "../lib/betting";
import "../betting.css";

function StatusBadge({ status }) {
  const map = {
    WON: { cls: "badge-won", label: "KAZANDI", icon: Trophy },
    LOST: { cls: "badge-lost", label: "KAYBETTİ", icon: XCircle },
    PENDING: { cls: "badge-pending", label: "BEKLİYOR", icon: Clock },
    REFUNDED: { cls: "badge-refunded", label: "İADE", icon: RefreshCw },
  };
  const m = map[status] || map.PENDING;
  const Icon = m.icon;
  return <span className={`btg-badge ${m.cls}`}><Icon className="w-3 h-3" /> {m.label}</span>;
}

function ItemStatusBadge({ status }) {
  const map = {
    WON: "text-[#c3f400]",
    LOST: "text-[#ff8f9c]",
    PENDING: "text-[color:var(--btg-primary-soft)]",
  };
  return <span className={`text-[10px] font-bold uppercase ${map[status] || map.PENDING}`}>{status === "WON" ? "✓" : status === "LOST" ? "✕" : "..."}</span>;
}

function CouponCard({ c }) {
  return (
    <div className="btg-card p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase text-[color:var(--btg-muted)] tracking-wider font-bold">Kupon ID</div>
          <div className="btg-num text-xs text-[color:var(--btg-muted)]">{c.id.slice(0, 8)}...</div>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <div className="space-y-2 mb-3">
        {c.items.map((it, i) => (
          <div key={i} className="flex items-start gap-2 combo-line">
            <ItemStatusBadge status={it.status} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">
                {it.match?.home?.name || "?"} <span className="text-[color:var(--btg-muted)] font-normal">vs</span> {it.match?.away?.name || "?"}
                {it.match?.status === "finished" && (
                  <span className="ml-2 btg-num text-[color:var(--btg-primary-soft)] text-xs">{it.match?.home_score}-{it.match?.away_score}{it.match?.home_corners != null ? ` • K:${it.match?.home_corners}-${it.match?.away_corners}` : ""}</span>
                )}
              </div>
              <div className="text-[11px] text-[color:var(--btg-muted)]">
                {BET_TYPE_LABEL[it.bet_type]} • <span className="text-[color:var(--btg-primary-soft)] font-semibold">{SELECTION_LABEL[it.selection]}</span>
                <span className="ml-1 btg-num text-[color:var(--btg-accent)] font-bold">@{Number(it.odd).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-[color:var(--btg-border)] pt-3">
        <div>
          <div className="text-[10px] uppercase text-[color:var(--btg-muted)] tracking-wider font-bold">Yatırılan</div>
          <CoinAmount amount={c.stake} size={14} className="text-sm" />
        </div>
        <div>
          <div className="text-[10px] uppercase text-[color:var(--btg-muted)] tracking-wider font-bold">Oran</div>
          <div className="btg-num text-sm text-[color:var(--btg-primary-soft)] font-black">{Number(c.total_odd).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[color:var(--btg-muted)] tracking-wider font-bold">{c.status === "WON" ? "Kazanç" : "Potansiyel"}</div>
          <CoinAmount amount={c.status === "WON" ? (c.payout || 0) : c.potential_payout} size={14} className={`text-sm ${c.status === "WON" ? "text-[color:var(--btg-accent)]" : ""}`} />
        </div>
      </div>
    </div>
  );
}

export default function MyCouponsPage({ onBack }) {
  const [coupons, setCoupons] = useState([]);
  const [wallet, setWallet] = useState(0);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [c, w] = await Promise.all([getMyCoupons(), getWallet()]);
      setCoupons(c);
      setWallet(w);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, []);

  const filtered = tab === "all" ? coupons
    : tab === "active" ? coupons.filter((c) => c.status === "PENDING")
    : coupons.filter((c) => c.status !== "PENDING");

  const stats = {
    total: coupons.length,
    won: coupons.filter((c) => c.status === "WON").length,
    lost: coupons.filter((c) => c.status === "LOST").length,
    pending: coupons.filter((c) => c.status === "PENDING").length,
  };

  return (
    <div className="betting-scope min-h-screen" style={{ background: "radial-gradient(1200px 600px at 50% -10%, rgba(0,242,234,0.14), transparent 60%), #0b0e11" }}>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4 py-2">
          <button type="button" onClick={onBack} className="btg-pill flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> BAHİS</button>
          <span className="coin-chip"><CoinIcon size={22} /><span>{wallet.toLocaleString("tr-TR")}</span></span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Ticket className="w-5 h-5 text-[color:var(--btg-primary-soft)]" />
          <h1 className="font-black text-2xl">KUPONLARIM</h1>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="btg-card p-2 text-center">
            <div className="btg-num text-lg font-black">{stats.total}</div>
            <div className="text-[9px] uppercase text-[color:var(--btg-muted)]">Toplam</div>
          </div>
          <div className="btg-card p-2 text-center">
            <div className="btg-num text-lg font-black text-[#c3f400]">{stats.won}</div>
            <div className="text-[9px] uppercase text-[color:var(--btg-muted)]">Kazandı</div>
          </div>
          <div className="btg-card p-2 text-center">
            <div className="btg-num text-lg font-black text-[#ff8f9c]">{stats.lost}</div>
            <div className="text-[9px] uppercase text-[color:var(--btg-muted)]">Kaybetti</div>
          </div>
          <div className="btg-card p-2 text-center">
            <div className="btg-num text-lg font-black text-[color:var(--btg-primary-soft)]">{stats.pending}</div>
            <div className="text-[9px] uppercase text-[color:var(--btg-muted)]">Bekliyor</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button type="button" onClick={() => setTab("all")} className={`btg-tab ${tab === "all" ? "active" : ""}`}>Tümü</button>
          <button type="button" onClick={() => setTab("active")} className={`btg-tab ${tab === "active" ? "active" : ""}`}>Aktif</button>
          <button type="button" onClick={() => setTab("history")} className={`btg-tab ${tab === "history" ? "active" : ""}`}>Geçmiş</button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[color:var(--btg-muted)]">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="btg-card p-8 text-center">
            <Ticket className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <div className="font-bold">Henüz kupon yok</div>
            <div className="text-sm text-[color:var(--btg-muted)] mt-1">Bahis sayfasına dön ve ilk kuponunu oluştur.</div>
          </div>
        ) : (
          filtered.map((c) => <CouponCard key={c.id} c={c} />)
        )}
      </div>
    </div>
  );
}
