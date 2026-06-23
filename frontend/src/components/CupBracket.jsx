import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import api from "../lib/api";
import { Dialog, DialogContent } from "./ui/dialog";
import { Trophy, Crown, Download, Loader2, ChevronRight, Check, ShieldHalf } from "lucide-react";

function Logo({ t, size = 24 }) {
  const cls = `rounded-full object-cover border border-white/10 shrink-0`;
  if (!t) return <span className="w-6 h-6 rounded-full bg-white/10 inline-block shrink-0" />;
  return t.logo_url ? (
    <img src={t.logo_url} alt="" className={cls} style={{ width: size, height: size }} />
  ) : (
    <span className={`${cls} bg-white/10 flex items-center justify-center text-[9px] font-bold`} style={{ width: size, height: size }}>
      {t.abbreviation}
    </span>
  );
}

function TeamLine({ t, score, win, pen, tbd }) {
  if (tbd) {
    return (
      <div className="flex items-center justify-between gap-2 py-1.5 opacity-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-white/5 inline-block shrink-0" />
          <span className="text-sm text-zinc-500">Belirlenecek</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-between gap-2 py-1.5 px-1 rounded-lg transition-colors ${win ? "bg-neon-green/10 text-neon-green" : "text-zinc-200"}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Logo t={t} size={28} />
        <span className={`text-sm truncate ${win ? "font-bold" : "font-medium"}`}>{t?.name}</span>
        {win && <Check className="w-3.5 h-3.5 shrink-0" />}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {pen && <span className="text-[10px] text-yellow-400 font-bold">(P)</span>}
        <span className={`font-heading ${win ? "font-extrabold" : "font-bold text-zinc-400"} text-lg w-6 text-center`}>
          {score == null ? "–" : score}
        </span>
      </div>
    </div>
  );
}

function CupMatchCard({ m, index }) {
  const homeWin = m.winner_team_id && m.home && m.winner_team_id === m.home.id;
  const awayWin = m.winner_team_id && m.away && m.winner_team_id === m.away.id;
  const penH = m.pen_winner_team_id && m.home && m.pen_winner_team_id === m.home.id;
  const penA = m.pen_winner_team_id && m.away && m.pen_winner_team_id === m.away.id;
  const live = m.status === "live" && !m.winner_team_id;
  return (
    <div
      data-testid={`cup-match-${m.id}`}
      className={`relative glass rounded-2xl px-3 py-2.5 border transition-all overflow-hidden ${
        live ? "border-neon-green/40" : m.winner_team_id ? "border-white/10" : "border-white/5"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold tracking-wider text-zinc-500">EŞLEŞME {index + 1}</span>
        {live ? (
          <span className="text-[10px] font-bold neon-text-green animate-pulse-glow">● CANLI</span>
        ) : m.bye ? (
          <span className="text-[10px] neon-text-green font-semibold">BAY</span>
        ) : m.status === "finished" ? (
          <span className="text-[10px] text-zinc-500 font-semibold">BİTTİ</span>
        ) : (
          <span className="text-[10px] text-zinc-600 font-semibold">BEKLİYOR</span>
        )}
      </div>
      <TeamLine t={m.home} score={m.bye ? null : m.home_score} win={homeWin} pen={penH} />
      <div className="h-px bg-white/5 my-0.5" />
      {m.bye ? (
        <div className="flex items-center gap-1.5 py-1.5 px-1 text-[11px] neon-text-green font-semibold">
          <ChevronRight className="w-3.5 h-3.5" /> Otomatik tur atladı
        </div>
      ) : (
        <TeamLine t={m.away} score={m.away_score} win={awayWin} pen={penA} tbd={!m.away} />
      )}
    </div>
  );
}

export function CupBracket({ bracket, onOpenSummary }) {
  const rounds = bracket?.rounds || [];
  const [active, setActive] = useState(0);

  useEffect(() => {
    // default to the latest round (the one currently being played)
    if (rounds.length) setActive(rounds.length - 1);
  }, [rounds.length]);

  if (rounds.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center" data-testid="cup-empty">
        <ShieldHalf className="w-12 h-12 mx-auto mb-3 text-neon-blue/70" />
        <h3 className="font-heading text-2xl mb-1">KUPA ÇEKİLİŞİ BEKLENİYOR</h3>
        <p className="text-zinc-400 text-sm">Yönetici çekilişi yaptığında eşleşmeler burada görünecek.</p>
      </div>
    );
  }

  const current = rounds[active] || rounds[rounds.length - 1];
  const champion = bracket?.champion;

  return (
    <div className="space-y-4" data-testid="cup-bracket">
      {champion && (
        <div className="relative overflow-hidden glass rounded-3xl p-5 border border-yellow-500/30" data-testid="cup-champion-banner">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-400/20 blur-3xl rounded-full" />
          <div className="relative flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Crown className="w-9 h-9 text-yellow-400 drop-shadow-[0_0_14px_rgba(250,204,21,0.5)]" />
              <div>
                <div className="label-xs text-yellow-400">Şampiyon</div>
                <div className="font-heading text-2xl flex items-center gap-2"><Logo t={champion} size={28} /> {champion.name}</div>
              </div>
            </div>
            <button onClick={onOpenSummary} data-testid="open-cup-summary-btn" className="btn-primary rounded-full px-5 py-2.5 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Turnuva Özeti
            </button>
          </div>
        </div>
      )}

      {/* Round tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" data-testid="cup-round-tabs">
        {rounds.map((r, i) => (
          <button
            key={r.round}
            onClick={() => setActive(i)}
            data-testid={`cup-round-tab-${r.round}`}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${
              i === active ? "btn-primary" : "glass text-zinc-300 hover:text-white"
            }`}
          >
            {r.label}
            {r.complete && <Check className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>

      <div className="text-xs text-zinc-500 flex items-center justify-between">
        <span>{current.label} · {current.matches.length} eşleşme</span>
        <span>{current.complete ? "Tamamlandı" : "Devam ediyor"}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {current.matches.map((m, i) => (
          <CupMatchCard key={m.id} m={m} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Tournament Summary (PNG export) ---------------- */
export function CupSummaryModal({ open, onClose }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      setData(null);
      api.get("/cup/summary").then((r) => setData(r.data)).catch(() => {});
    }
  }, [open]);

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(ref.current, { backgroundColor: "#0a1033", scale: 2, useCORS: true });
      const link = document.createElement("a");
      link.download = `kupa-ozeti-${(data?.tournament?.name || "turnuva").replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-ink-900 border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto thin-scroll p-4" data-testid="cup-summary-modal">
        <div className="flex items-center justify-end mb-3">
          <button onClick={download} disabled={busy || !data} data-testid="download-cup-summary-btn" className="rounded-full px-5 py-2 bg-neon-green/15 border border-neon-green/40 text-neon-green flex items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PNG İndir
          </button>
        </div>
        {!data ? (
          <div className="py-16 text-center text-zinc-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div ref={ref} className="rounded-2xl p-6 sm:p-8" style={{ background: "linear-gradient(160deg,#0a1240 0%,#0b1a6b 55%,#1230a8 100%)" }} data-testid="cup-summary-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[11px] tracking-[0.2em] text-blue-200/80 uppercase">Kupa Turnuvası</div>
                <div className="font-heading font-extrabold text-3xl text-white">{data.tournament?.name}</div>
              </div>
              <img src="/icon-192.png" alt="" className="w-14 h-14" />
            </div>

            {/* Champion */}
            {data.champion && (
              <div className="rounded-2xl p-5 mb-5 flex items-center gap-4" style={{ background: "rgba(255,255,255,0.08)" }}>
                <Crown className="w-10 h-10 text-yellow-300" />
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-yellow-200">Şampiyon</div>
                  <div className="font-heading text-2xl text-white flex items-center gap-2"><Logo t={data.champion} size={30} /> {data.champion.name}</div>
                </div>
                {data.top_scorer_team && (
                  <div className="ml-auto text-right">
                    <div className="text-[11px] uppercase tracking-wide text-blue-200">En Golcü Takım</div>
                    <div className="font-heading text-lg text-white flex items-center gap-2 justify-end">
                      {data.top_scorer_team.name} <span className="text-neon-green">{data.top_scorer_team.goals} gol</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bracket tree (columns) */}
            <div className="overflow-x-auto thin-scroll">
              <div className="flex gap-4 min-w-min">
                {data.rounds.map((r) => (
                  <div key={r.round} className="shrink-0 w-48">
                    <div className="text-[11px] uppercase tracking-wide text-blue-200 mb-2 font-bold">{r.label}</div>
                    <div className="space-y-2">
                      {r.matches.map((m) => {
                        const homeWin = m.winner_team_id && m.home && m.winner_team_id === m.home.id;
                        const awayWin = m.winner_team_id && m.away && m.winner_team_id === m.away.id;
                        return (
                          <div key={m.id} className="rounded-xl px-2.5 py-1.5 text-xs" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className={`flex items-center justify-between gap-1 ${homeWin ? "text-neon-green font-bold" : "text-blue-100"}`}>
                              <span className="truncate">{m.home?.abbreviation || "?"}</span>
                              <span>{m.bye ? "BAY" : m.home_score}</span>
                            </div>
                            {!m.bye && (
                              <div className={`flex items-center justify-between gap-1 ${awayWin ? "text-neon-green font-bold" : "text-blue-100"}`}>
                                <span className="truncate">{m.away?.abbreviation || "?"}</span>
                                <span>{m.away_score}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
