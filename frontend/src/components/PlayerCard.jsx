import React from "react";

export const DEFAULT_PLAYER = "/player-default.png";
export const DEFAULT_GK = "/gk-default.png";

export function defaultPhoto(isGK) {
  return isGK ? DEFAULT_GK : DEFAULT_PLAYER;
}

export function PlayerCard({ player, label, onClick, mini = false, isGK = false }) {
  const empty = !player;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`player-slot-${label || (player && player.slot) || "x"}`}
      className={`group relative flex flex-col items-center ${mini ? "w-[58px]" : "w-[72px]"} focus:outline-none`}
    >
      <div
        className={`relative ${mini ? "w-12 h-12" : "w-14 h-14"} rounded-full overflow-hidden border-2 transition-all duration-200 ${
          empty
            ? "border-dashed border-white/30 bg-black/40 group-hover:border-neon-blue"
            : "border-neon-blue/70 bg-black/60 shadow-[0_0_14px_rgba(0,245,255,0.35)] group-hover:scale-105"
        }`}
      >
        {empty ? (
          <span className="absolute inset-0 flex items-center justify-center text-2xl text-white/50 font-light">+</span>
        ) : (
          <img src={player.photo_url || defaultPhoto(isGK)} alt={player.name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="mt-1 text-center max-w-[80px]">
        {empty ? (
          <span className="text-[10px] uppercase tracking-wider text-white/60">{label}</span>
        ) : (
          <>
            <div className="text-[11px] font-semibold leading-tight truncate text-white px-1">{player.name}</div>
            <div className="text-[10px] neon-text-green font-bold">€{player.value}M</div>
          </>
        )}
      </div>
    </button>
  );
}
