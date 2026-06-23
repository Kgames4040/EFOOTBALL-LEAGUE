import React, { useState, useMemo } from "react";
import { COUNTRIES, flagEmoji } from "../lib/countries";
import { ChevronDown, Search } from "lucide-react";

export function CountrySelect({ value, onChange, testid = "country-select" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = useMemo(() => COUNTRIES.find((c) => c.name === value), [value]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid={`${testid}-trigger`}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition-colors text-left"
      >
        <span className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              <span className="text-lg">{flagEmoji(selected.code)}</span>
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-zinc-500">Vatandaşlık seçin</span>
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full glass-strong rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ülke ara..."
              data-testid={`${testid}-search`}
              className="bg-transparent outline-none text-sm w-full placeholder:text-zinc-600"
            />
          </div>
          <div className="max-h-60 overflow-y-auto thin-scroll">
            {filtered.map((c, i) => (
              <button
                type="button"
                key={`${c.code}-${i}`}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQ("");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors text-left text-sm"
              >
                <span className="text-lg">{flagEmoji(c.code)}</span>
                <span>{c.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-4 text-sm text-zinc-500">Sonuç yok</div>}
          </div>
        </div>
      )}
    </div>
  );
}
