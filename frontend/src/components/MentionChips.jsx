import React from "react";
import { useNavigate } from "react-router-dom";
import { AtSign, ExternalLink } from "lucide-react";

// Fancy clickable chips for magazine @mentions (pages / teams / users).
export function MentionChips({ mentions, onNavigate }) {
  const navigate = useNavigate();
  if (!mentions || mentions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3" data-testid="mention-chips">
      {mentions.map((mm, i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate(); navigate(mm.url || "/"); }}
          data-testid={`mention-chip-${i}`}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white border border-neon-blue/40 bg-gradient-to-r from-neon-blue/25 to-fuchsia-500/25 hover:from-neon-blue/40 hover:to-fuchsia-500/40 shadow-[0_0_12px_rgba(0,245,255,0.25)] transition-all"
        >
          {mm.type === "user" ? <AtSign className="w-3.5 h-3.5 text-neon-blue" /> : <ExternalLink className="w-3.5 h-3.5 text-neon-blue" />}
          {mm.tag || mm.label}
        </button>
      ))}
    </div>
  );
}
