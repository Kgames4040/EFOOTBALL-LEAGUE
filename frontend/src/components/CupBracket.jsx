import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import api from "../lib/api";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
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

function CupMatchCard({ m, index, compact }) {
  const navigate = useNavigate();
  const homeWin = m.winner_team_id && m.home && m.winner_team_id === m.home.id;
  const awayWin = m.winner_team_id && m.away && m.winner_team_id === m.away.id;
  const penH = m.pen_winner_team_id && m.home && m.pen_winner_team_id === m.home.id;
  const penA = m.pen_winner_team_id && m.away && m.pen_winner_team_id === m.away.id;
  const live = m.status === "live" && !m.winner_team_id;
  const clickable = !m.bye;
  return (
    <div
      data-testid={`cup-match-${m.id}`}
      onClick={() => clickable && navigate(`/match/${m.id}`)}
      className={`relative glass rounded-2xl border transition-all ${compact ? "px-2.5 py-1.5" : "px-3 py-2.5"} ${clickable ? "cursor-pointer hover:bg-white/5" : ""} ${
        live ? "border-neon-green/40" : m.winner_team_id ? "border-white/10" : "border-white/5"
      }`}
    >
      <div className={`flex items-center justify-between ${compact ? "mb-0.5" : "mb-1.5"}`}>
        {!compact && <span className="text-[10px] font-bold tracking-wider text-zinc-500">EŞLEŞME {index + 1}</span>}
        {compact && <span className="text-[9px] font-bold tracking-wider text-zinc-600">#{index + 1}</span>}
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
      <TeamLine t={m.home} score={m.bye ? null : (live ? m.live_home : m.home_score)} win={homeWin} pen={penH} />
      <div className="h-px bg-white/5 my-0.5" />
      {m.bye ? (
        <div className="flex items-center gap-1.5 py-1 px-1 text-[11px] neon-text-green font-semibold">
          <ChevronRight className="w-3.5 h-3.5" /> Tur atladı
        </div>
      ) : (
        <TeamLine t={m.away} score={live ? m.live_away : m.away_score} win={awayWin} pen={penA} tbd={!m.away} />
      )}
    </div>
  );
}

/* ---------- Connector lines between rounds (tree view) ---------- */
function Connector({ count, color = "rgba(0,245,255,0.35)" }) {
  const groups = [];
  for (let g = 0; g * 2 < count; g++) groups.push(g);
  const line = (extra) => ({ borderTop: `2px solid ${color}`, position: "absolute", ...extra });
  return (
    <>
      {groups.map((g) => {
        const isPair = 2 * g + 1 < count;
        const topPct = ((2 * g) / count) * 100;
        const hPct = ((isPair ? 2 : 1) / count) * 100;
        return (
          <div key={g} className="absolute left-0 right-0" style={{ top: `${topPct}%`, height: `${hPct}%` }}>
            {isPair ? (
              <>
                <span style={line({ left: 0, top: "25%", width: "50%" })} />
                <span style={line({ left: 0, top: "75%", width: "50%" })} />
                <span style={{ borderLeft: `2px solid ${color}`, position: "absolute", left: "50%", top: "25%", height: "50%" }} />
                <span style={line({ left: "50%", right: 0, top: "50%" })} />
              </>
            ) : (
              <span style={line({ left: 0, right: 0, top: "50%" })} />
            )}
          </div>
        );
      })}
    </>
  );
}

/* ---------- Bracket tree (rounds as columns + connector lines) ---------- */
function BracketTree({ rounds, renderMatch, lineColor, labelClass = "text-zinc-300", testid, colWidth = 184 }) {
  if (!rounds?.length) return null;
  const H = Math.max(2, rounds[0].matches.length) * 84;
  return (
    <div className="overflow-x-auto thin-scroll pb-1" data-testid={testid}>
      <div className="flex min-w-min">
        {rounds.map((r, ri) => (
          <React.Fragment key={r.round}>
            <div className="shrink-0 flex flex-col" style={{ width: colWidth }}>
              <div className={`h-9 flex flex-col justify-center mb-1 text-center ${labelClass}`}>
                <div className="text-[11px] font-bold tracking-wider uppercase">{r.label}</div>
                <div className="text-[9px] opacity-70">{r.matches.length} eşleşme{r.complete ? " · Bitti" : ""}</div>
              </div>
              <div className="flex flex-col" style={{ height: H }}>
                {r.matches.map((m, i) => (
                  <div key={m.id} className="flex-1 flex items-center px-1">
                    <div className="w-full">{renderMatch(m, i)}</div>
                  </div>
                ))}
              </div>
            </div>
            {ri < rounds.length - 1 && (
              <div className="shrink-0 flex flex-col" style={{ width: 22 }}>
                <div className="h-9 mb-1" />
                <div className="relative" style={{ height: H }}>
                  <Connector count={r.matches.length} color={lineColor} />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function CupBracket({ bracket, onOpenSummary }) {
  const rounds = bracket?.rounds || [];

  if (rounds.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center" data-testid="cup-empty">
        <ShieldHalf className="w-12 h-12 mx-auto mb-3 text-neon-blue/70" />
        <h3 className="font-heading text-2xl mb-1">KUPA ÇEKİLİŞİ BEKLENİYOR</h3>
        <p className="text-zinc-400 text-sm">Yönetici çekilişi yaptığında eşleşmeler burada görünecek.</p>
      </div>
    );
  }

  const current = rounds[rounds.length - 1];
  const champion = bracket?.champion;

  return (
    <div className="space-y-4 min-w-0" data-testid="cup-bracket">
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

      <div className="glass rounded-3xl p-3 sm:p-4 min-w-0">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-zinc-300 tracking-wide">EŞLEŞME AĞACI</span>
          <span className="text-[10px] text-zinc-500">{current.complete ? "Güncel tur tamamlandı" : "Yana kaydırarak tüm turları görün →"}</span>
        </div>
        <BracketTree rounds={rounds} lineColor="rgba(0,245,255,0.35)" labelClass="text-neon-blue" testid="cup-tree" renderMatch={(m, i) => <CupMatchCard m={m} index={i} compact />} />
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
      const canvas = await html2canvas(ref.current, {
        backgroundColor: "#0a1033",
        scale: 2,
        useCORS: true,
        onclone: (doc) => {
          const el = doc.querySelector('[data-testid="cup-summary-card"]');
          if (el) {
            el.style.lineHeight = "1.6";
            el.querySelectorAll("span").forEach((s) => { s.style.lineHeight = "1.6"; s.style.paddingBottom = "1px"; });
          }
        },
      });
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
        <DialogTitle className="sr-only">Turnuva Özeti</DialogTitle>
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

            {/* Bracket tree (columns + connector lines) */}
            <BracketTree
              rounds={data.rounds}
              lineColor="rgba(147,197,253,0.55)"
              labelClass="text-blue-200"
              testid="cup-summary-tree"
              colWidth={172}
              renderMatch={(m) => {
                const homeWin = m.winner_team_id && m.home && m.winner_team_id === m.home.id;
                const awayWin = m.winner_team_id && m.away && m.winner_team_id === m.away.id;
                const row = (abbr, score, win, isBye) => (
                  <div className="flex items-center justify-between gap-2" style={{ lineHeight: 1.7, minHeight: 24 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: win ? "#22e07a" : "#dbeafe", whiteSpace: "nowrap" }}>{abbr || "?"}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: win ? "#22e07a" : "#dbeafe" }}>{isBye ? "BAY" : (score == null ? "–" : score)}</span>
                  </div>
                );
                return (
                  <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                    {row(m.home?.abbreviation, m.bye ? null : m.home_score, homeWin, false)}
                    {!m.bye && (
                      <>
                        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "2px 0" }} />
                        {row(m.away?.abbreviation, m.away_score, awayWin, false)}
                      </>
                    )}
                    {m.bye && row(null, "BAY", false, true)}
                  </div>
                );
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
