import React, { useEffect, useState } from "react";
import { X, Swords, Trophy, Handshake, ShieldHalf } from "lucide-react";
import { getH2H } from "../lib/betting";
import "../betting.css";

export default function H2HModal({ teamA, teamB, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await getH2H(teamA, teamB);
        if (mounted) setData(d);
      } catch (e) {
        if (mounted) setErr(e?.response?.data?.detail || "Yüklenemedi");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [teamA, teamB]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div className="betting-scope w-full max-w-md btg-card p-5 btg-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-[color:var(--btg-primary-soft)]" />
            <div>
              <div className="text-[10px] uppercase text-[color:var(--btg-muted)] font-bold tracking-wider">Kafa Kafaya</div>
              <div className="text-lg font-black">H2H İSTATİSTİKLER</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[color:var(--btg-muted)] hover:text-white p-2"><X className="w-5 h-5" /></button>
        </div>

        {loading && <div className="text-center py-8 text-[color:var(--btg-muted)]">Yükleniyor...</div>}
        {err && <div className="text-center py-8 text-[#ff8f9c]">{err}</div>}
        {data && (
          <div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
              <div className="text-center">
                {data.team_a.logo_url && <img src={data.team_a.logo_url} alt="" className="w-14 h-14 mx-auto rounded-full object-cover mb-1 border-2 border-[color:var(--btg-primary)]/50" />}
                <div className="text-sm font-bold truncate">{data.team_a.name}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[color:var(--btg-muted)]">TOPLAM</div>
                <div className="btg-num text-3xl font-black text-[color:var(--btg-accent)]">{data.stats.total}</div>
                <div className="text-[10px] text-[color:var(--btg-muted)]">Karşılaşma</div>
              </div>
              <div className="text-center">
                {data.team_b.logo_url && <img src={data.team_b.logo_url} alt="" className="w-14 h-14 mx-auto rounded-full object-cover mb-1 border-2 border-[color:var(--btg-accent)]/50" />}
                <div className="text-sm font-bold truncate">{data.team_b.name}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="btg-card p-3 text-center">
                <Trophy className="w-4 h-4 mx-auto text-[color:var(--btg-primary-soft)] mb-1" />
                <div className="btg-num text-2xl font-black text-[color:var(--btg-primary-soft)]">{data.stats.wins_a}</div>
                <div className="text-[10px] text-[color:var(--btg-muted)] uppercase tracking-wider">{data.team_a.abbreviation}</div>
              </div>
              <div className="btg-card p-3 text-center">
                <Handshake className="w-4 h-4 mx-auto text-[color:var(--btg-muted)] mb-1" />
                <div className="btg-num text-2xl font-black">{data.stats.draws}</div>
                <div className="text-[10px] text-[color:var(--btg-muted)] uppercase tracking-wider">Berabere</div>
              </div>
              <div className="btg-card p-3 text-center">
                <Trophy className="w-4 h-4 mx-auto text-[color:var(--btg-accent)] mb-1" />
                <div className="btg-num text-2xl font-black text-[color:var(--btg-accent)]">{data.stats.wins_b}</div>
                <div className="text-[10px] text-[color:var(--btg-muted)] uppercase tracking-wider">{data.team_b.abbreviation}</div>
              </div>
            </div>

            <div className="btg-card p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--btg-muted)]">Gol Farkı</span>
                <span className="btg-num font-bold">
                  <span className="text-[color:var(--btg-primary-soft)]">{data.stats.goals_a}</span>
                  <span className="text-[color:var(--btg-muted)] mx-1">-</span>
                  <span className="text-[color:var(--btg-accent)]">{data.stats.goals_b}</span>
                </span>
              </div>
            </div>

            {data.recent.length > 0 && (
              <div>
                <div className="text-[10px] uppercase text-[color:var(--btg-muted)] tracking-wider font-bold mb-2">Son {data.recent.length} Karşılaşma</div>
                <div className="space-y-1.5">
                  {data.recent.map((m) => {
                    const aIsHome = m.home_team_id === data.team_a.id;
                    const scoreA = aIsHome ? m.home_score : m.away_score;
                    const scoreB = aIsHome ? m.away_score : m.home_score;
                    return (
                      <div key={m.id} className="flex items-center justify-between btg-card p-2 text-xs">
                        <span className="text-[color:var(--btg-muted)]">H{m.week || "?"}</span>
                        <span className="btg-num font-bold"><span className="text-[color:var(--btg-primary-soft)]">{scoreA}</span> - <span className="text-[color:var(--btg-accent)]">{scoreB}</span></span>
                        <span className="text-[color:var(--btg-muted)] text-[10px]">{aIsHome ? "E" : "D"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.recent.length === 0 && (
              <div className="text-center py-6 text-[color:var(--btg-muted)] text-sm">
                <ShieldHalf className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Bu iki takım henüz karşılaşmadı. İlk derbi hazırlanıyor!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
