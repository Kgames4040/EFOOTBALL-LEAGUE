import React from "react";
import { Check, X, Minus } from "lucide-react";

function Last5({ seq }) {
  return (
    <div className="flex items-center gap-1 justify-center" data-testid="last5">
      {(seq || []).length === 0 && <span className="text-zinc-600 text-xs">—</span>}
      {(seq || []).map((r, i) => (
        <span
          key={i}
          data-testid={`last5-${r}`}
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full border ${
            r === "W"
              ? "bg-neon-green/20 text-neon-green border-neon-green/40 shadow-[0_0_6px_rgba(57,255,20,0.4)]"
              : r === "L"
              ? "bg-red-500/20 text-red-400 border-red-500/40"
              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/40"
          }`}
          title={r === "W" ? "Galibiyet" : r === "L" ? "Mağlubiyet" : "Beraberlik"}
        >
          {r === "W" ? (
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          ) : r === "L" ? (
            <X className="w-2.5 h-2.5" strokeWidth={3} />
          ) : (
            <Minus className="w-2.5 h-2.5" strokeWidth={3} />
          )}
        </span>
      ))}
    </div>
  );
}

export { Last5 };

// hideMobile cols collapse on small screens so the table always fits the phone width.
const COLS = [
  { k: "OM", t: "OM", hideMobile: false },
  { k: "G", t: "G", hideMobile: true },
  { k: "B", t: "B", hideMobile: true },
  { k: "M", t: "M", hideMobile: true },
  { k: "AG", t: "AG", hideMobile: true },
  { k: "YG", t: "YG", hideMobile: true },
  { k: "A", t: "A", hideMobile: false },
];

export function StandingsTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <div className="text-center text-zinc-500 py-10 text-sm">Henüz puan durumu yok. Fikstür oluşturulup maçlar oynandığında burada görünecek.</div>;
  }
  return (
    <div className="overflow-x-auto thin-scroll -mx-2 px-2" data-testid="standings-table">
      <table className="w-full text-sm sm:min-w-[560px]">
        <thead>
          <tr className="label-xs text-left">
            <th className="py-2 pl-1 sm:pl-2 w-6">#</th>
            <th className="py-2">Takım</th>
            {COLS.map((c) => (
              <th key={c.k} className={`py-2 px-1 sm:px-1.5 text-center ${c.hideMobile ? "hidden sm:table-cell" : ""}`}>{c.t}</th>
            ))}
            <th className="py-2 px-1 sm:px-1.5 text-center neon-text-blue">P</th>
            <th className="py-2 px-1 sm:px-2 text-center">Son 5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.team_id}
              data-testid={`standings-row-${r.team_id}`}
              className={`border-t border-white/5 ${i % 2 ? "bg-white/[0.015]" : ""} hover:bg-white/5 transition-colors`}
            >
              <td className="py-2.5 pl-1 sm:pl-2">
                <span className={`font-heading ${i === 0 ? "neon-text-green" : "text-zinc-400"}`}>{r.rank}</span>
              </td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  {r.logo_url ? (
                    <img src={r.logo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold shrink-0">{r.abbreviation}</span>
                  )}
                  <span className="font-medium truncate max-w-[90px] sm:max-w-[120px]">{r.name}</span>
                </div>
              </td>
              {COLS.map((c) => (
                <td key={c.k} className={`py-2.5 px-1 sm:px-1.5 text-center text-zinc-300 ${c.hideMobile ? "hidden sm:table-cell" : ""}`}>{r[c.k]}</td>
              ))}
              <td className="py-2.5 px-1 sm:px-1.5 text-center font-heading font-bold text-white">{r.P}</td>
              <td className="py-2.5 px-1 sm:px-2"><Last5 seq={r.last5} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
