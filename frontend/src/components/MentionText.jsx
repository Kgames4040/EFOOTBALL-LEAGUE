import React from "react";
import { useNavigate } from "react-router-dom";

// Escape regex special chars for a literal match.
function escapeReg(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Renders a body string with any @mentions highlighted as clickable colored links.
// - matches "@Tag" tokens whose Tag exactly equals a mention.tag (case-insensitive)
// - also matches the tag WITHOUT the leading "@" (as long as it's not embedded in a word)
export function MentionText({ text, mentions, onNavigate, className = "" }) {
  const navigate = useNavigate();
  if (!text) return null;
  const list = (mentions || []).filter((m) => m && (m.tag || m.label));
  if (list.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build a single regex OR of all tags, longest-first (so "Ana Sayfa" wins over "Ana").
  const tags = [...list].sort((a, b) => (b.tag || b.label).length - (a.tag || a.label).length);
  const pattern = tags.map((m) => `@?${escapeReg(m.tag || m.label)}`).join("|");
  const re = new RegExp(`(${pattern})`, "gi");

  const findMention = (token) => {
    const cleaned = token.replace(/^@/, "").toLowerCase();
    return tags.find((m) => (m.tag || m.label).toLowerCase() === cleaned);
  };

  const parts = String(text).split(re);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        const mm = findMention(part);
        if (mm) {
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigate) onNavigate();
                navigate(mm.url || "/");
              }}
              data-testid={`mention-inline-${i}`}
              className="inline-flex items-center align-baseline mx-0.5 px-1.5 py-0.5 rounded-md font-bold neon-text-blue bg-neon-blue/10 border border-neon-blue/40 hover:bg-neon-blue/25 hover:shadow-[0_0_10px_rgba(0,245,255,0.35)] transition-all cursor-pointer text-[0.95em]"
            >
              {part.startsWith("@") ? part : `@${part}`}
            </button>
          );
        }
        // Preserve newlines
        return part.split("\n").map((line, j, arr) => (
          <React.Fragment key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </React.Fragment>
        ));
      })}
    </span>
  );
}
