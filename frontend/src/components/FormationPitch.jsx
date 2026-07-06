import React from "react";
import { FORMATIONS } from "../lib/formations";
import { PlayerCard } from "./PlayerCard";

const PITCH_BG =
  "https://images.unsplash.com/photo-1676746424139-77f8bd8922a8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000";

export function FormationPitch({ formation, players, onSlotClick }) {
  const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];
  const bySlot = {};
  (players || []).forEach((p) => {
    if (!p.bench && p.slot) bySlot[p.slot] = p;
  });

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-white/10"
      style={{ aspectRatio: "3 / 4", maxWidth: 520, margin: "0 auto" }}
      data-testid="formation-pitch"
    >
      <img src={PITCH_BG} alt="saha" className="absolute inset-0 w-full h-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
      {/* pitch markings */}
      <div className="absolute inset-3 border border-white/20 rounded-lg pointer-events-none" />
      <div className="absolute left-3 right-3 top-1/2 h-px bg-white/20 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/20 rounded-full pointer-events-none" />

      {slots.map((slot) => {
        const p = bySlot[slot.key];
        return (
          <div
            key={slot.key}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <PlayerCard player={p} label={slot.label} mini isGK={slot.key === "GK"} onClick={() => onSlotClick && onSlotClick(slot, p)} />
          </div>
        );
      })}
    </div>
  );
}
