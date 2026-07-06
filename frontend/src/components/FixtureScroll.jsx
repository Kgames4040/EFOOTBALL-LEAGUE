import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swords } from "lucide-react";
import H2HModal from "./H2HModal";

function TeamMini({ team, align = "left" }) {
  return (
    <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
      {team.logo_url ? (
        <img src={team.logo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
      ) : (
        <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold">{team.abbreviation}</span>
      )}
      <span className="text-sm font-bold font-heading">{team.abbreviation}</span>
    </div>
  );
}

function MatchCard({ m, onScheduledClick }) {
  const navigate = useNavigate();
  const finished = m.status === "finished";
  const live = m.status === "live";
  const scheduled = m.status === "scheduled";
  const handleClick = () => {
    if (scheduled && onScheduledClick) onScheduledClick(m);
    else navigate(`/match/${m.id}`);
  };
  return (
    <div
      data-testid={`fixture-match-${m.id}`}
      onClick={handleClick}
      className="glass rounded-xl px-3 py-2.5 w-[200px] shrink-0 hover:-translate-y-0.5 transition-transform cursor-pointer relative"
    >
      {scheduled && (
        <span className="absolute -top-1.5 -right-1.5 bg-neon-blue/20 border border-neon-blue/50 text-neon-blue text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 backdrop-blur">
          <Swords className="w-2.5 h-2.5" /> H2H
        </span>
      )}
      <div className="flex items-center justify-between">
        <TeamMini team={m.home} />
        <div className="text-center px-1 min-w-[52px]">
          {finished ? (
            <div className="font-heading font-extrabold text-base text-white">
              {m.home_score}<span className="text-zinc-500"> - </span>{m.away_score}
            </div>
          ) : live ? (
            <div>
              <div className="font-heading font-extrabold text-base neon-text-green">{m.live_home ?? 0}<span className="text-zinc-500"> - </span>{m.live_away ?? 0}</div>
              <span className="text-[9px] font-bold neon-text-green animate-pulse-glow">CANLI</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-400">{m.scheduled_time || "VS"}</span>
          )}
        </div>
        <TeamMini team={m.away} align="right" />
      </div>
      {finished && m.finished_at && (
        <div className="text-[9px] text-zinc-500 text-center mt-1">
          Bitti · {new Date(m.finished_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          {m.home_corners != null && m.away_corners != null && <span className="ml-1 text-cyan-300/70">• K: {m.home_corners}-{m.away_corners}</span>}
        </div>
      )}
    </div>
  );
}

// Full-width row used in mobile previews and the vertical expanded view (no horizontal scroll).
export function MatchRow({ m, onScheduledClick }) {
  const navigate = useNavigate();
  const finished = m.status === "finished";
  const live = m.status === "live";
  const scheduled = m.status === "scheduled";
  const handleClick = () => {
    if (scheduled && onScheduledClick) onScheduledClick(m);
    else navigate(`/match/${m.id}`);
  };
  return (
    <div data-testid={`fixture-row-${m.id}`} onClick={handleClick} className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors relative">
      {scheduled && (
        <span className="absolute top-1 right-1 bg-neon-blue/15 border border-neon-blue/40 text-neon-blue text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Swords className="w-2.5 h-2.5" /> H2H
        </span>
      )}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {m.home.logo_url ? (
          <img src={m.home.logo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold shrink-0">{m.home.abbreviation}</span>
        )}
        <span className="text-sm font-medium truncate">{m.home.abbreviation}</span>
      </div>
      <div className="text-center px-1 min-w-[54px]">
        {finished ? (
          <div>
            <div className="font-heading font-extrabold text-sm text-white">{m.home_score}<span className="text-zinc-500"> - </span>{m.away_score}</div>
            {m.home_corners != null && m.away_corners != null && (
              <div className="text-[9px] text-cyan-300/70">K {m.home_corners}-{m.away_corners}</div>
            )}
          </div>
        ) : live ? (
          <div>
            <div className="font-heading font-extrabold text-sm neon-text-green">{m.live_home ?? 0}<span className="text-zinc-500"> - </span>{m.live_away ?? 0}</div>
            <span className="text-[9px] font-bold neon-text-green animate-pulse-glow">CANLI</span>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-400">{m.scheduled_time || "VS"}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
        {m.away.logo_url ? (
          <img src={m.away.logo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold shrink-0">{m.away.abbreviation}</span>
        )}
        <span className="text-sm font-medium truncate">{m.away.abbreviation}</span>
      </div>
    </div>
  );
}

export function FixtureScroll({ matches, vertical = false }) {
  const [h2h, setH2h] = useState(null);
  const openH2H = (m) => {
    if (m?.home_team_id && m?.away_team_id) setH2h({ a: m.home_team_id, b: m.away_team_id });
  };
  const weeks = useMemo(() => {
    const map = {};
    (matches || []).forEach((m) => {
      (map[m.week] = map[m.week] || []).push(m);
    });
    return Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .map((w) => ({ week: w, matches: map[w] }));
  }, [matches]);

  if (weeks.length === 0) {
    return <div className="text-center text-zinc-500 py-8 text-sm">Fikstür henüz oluşturulmadı.</div>;
  }

  if (vertical) {
    return (
      <div className="space-y-5" data-testid="fixture-vertical">
        {weeks.map((wk) => (
          <div key={wk.week}>
            <div className="label-xs mb-2 neon-text-blue">{wk.week}. Hafta</div>
            <div className="space-y-2">
              {wk.matches.map((m) => (
                <MatchRow key={m.id} m={m} onScheduledClick={openH2H} />
              ))}
            </div>
          </div>
        ))}
        {h2h && <H2HModal teamA={h2h.a} teamB={h2h.b} onClose={() => setH2h(null)} />}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto thin-scroll pb-2" data-testid="fixture-scroll">
      <div className="flex gap-4 min-w-min">
        {weeks.map((wk) => (
          <div key={wk.week} className="shrink-0">
            <div className="label-xs mb-2 neon-text-blue">{wk.week}. Hafta</div>
            <div className="flex flex-col gap-2">
              {wk.matches.map((m) => (
                <MatchCard key={m.id} m={m} onScheduledClick={openH2H} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {h2h && <H2HModal teamA={h2h.a} teamB={h2h.b} onClose={() => setH2h(null)} />}
    </div>
  );
}
