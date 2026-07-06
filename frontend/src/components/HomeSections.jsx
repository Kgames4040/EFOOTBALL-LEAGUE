import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MatchRow } from "./FixtureScroll";
import { Last5 } from "./StandingsTable";
import H2HModal from "./H2HModal";

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true));
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const fn = (e) => setDesktop(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return desktop;
}

// Collapsed -> shows compact live preview that fits the screen.
// Expanded -> reveals full content in a vertically scrollable panel.
export function ExpandableSection({ icon: Icon, title, hint, preview, children, testid, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="glass rounded-3xl p-4 sm:p-5" data-testid={testid}>
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid={testid ? `${testid}-toggle` : undefined}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <h3 className="font-heading text-lg sm:text-xl flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-neon-blue" />} {title}
        </h3>
        <span className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0">
          {open ? "Kapat" : hint || "Detay"}
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {!open && <div className="mt-3" data-testid={testid ? `${testid}-preview` : undefined}>{preview}</div>}
      {open && (
        <div className="mt-4 max-h-[68vh] overflow-y-auto thin-scroll -mx-1 px-1" data-testid={testid ? `${testid}-full` : undefined}>
          {children}
        </div>
      )}
    </section>
  );
}

export function StandingsPreview({ rows }) {
  if (!rows || rows.length === 0) {
    return <div className="text-zinc-500 text-sm py-3">Henüz puan durumu yok.</div>;
  }
  return (
    <div className="space-y-1.5" data-testid="standings-preview-list">
      <div className="grid grid-cols-[1.25rem_1fr_1.75rem_1.75rem_auto] gap-1.5 label-xs px-1">
        <span>#</span><span>Takım</span><span className="text-center">O</span><span className="text-center neon-text-blue">P</span><span className="text-center">Son 5</span>
      </div>
      {rows.slice(0, 4).map((r, i) => (
        <div key={r.team_id} className="grid grid-cols-[1.25rem_1fr_1.75rem_1.75rem_auto] gap-1.5 items-center bg-white/[0.03] rounded-lg px-1 py-1.5">
          <span className={`font-heading text-sm ${i === 0 ? "neon-text-green" : "text-zinc-400"}`}>{r.rank}</span>
          <div className="flex items-center gap-2 min-w-0">
            {r.logo_url ? (
              <img src={r.logo_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold shrink-0">{r.abbreviation}</span>
            )}
            <span className="text-sm font-medium truncate">{r.name}</span>
          </div>
          <span className="text-center text-sm text-zinc-300">{r.OM}</span>
          <span className="text-center font-heading font-bold text-white">{r.P}</span>
          <Last5 seq={r.last5} />
        </div>
      ))}
      {rows.length > 4 && <div className="text-[11px] text-zinc-500 text-center pt-1">+{rows.length - 4} takım · tümünü görmek için dokun</div>}
    </div>
  );
}

// Picks the most relevant matches: live first, then upcoming, then recently finished.
export function pickPreviewMatches(matches, n = 4) {
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status !== "finished" && m.status !== "live");
  const finished = matches.filter((m) => m.status === "finished").reverse();
  return [...live, ...upcoming, ...finished].slice(0, n);
}

export function FixturePreview({ matches }) {
  const [h2h, setH2h] = useState(null);
  const items = pickPreviewMatches(matches || [], 4);
  if (items.length === 0) {
    return <div className="text-zinc-500 text-sm py-3">Fikstür henüz oluşturulmadı.</div>;
  }
  return (
    <div className="space-y-2" data-testid="fixture-preview-list">
      {items.map((m) => (
        <MatchRow key={m.id} m={m} onScheduledClick={(match) => match?.home_team_id && match?.away_team_id && setH2h({ a: match.home_team_id, b: match.away_team_id })} />
      ))}
      {h2h && <H2HModal teamA={h2h.a} teamB={h2h.b} onClose={() => setH2h(null)} />}
    </div>
  );
}
