import React from "react";
import { Trophy, Target, Crown, Newspaper, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ScorerWidget({ title, items, icon: Icon, color }) {
  return (
    <div className="glass rounded-2xl p-4" data-testid={`widget-${title}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <h4 className="font-heading text-sm uppercase tracking-wide">{title}</h4>
      </div>
      {(!items || items.length === 0) && <div className="text-xs text-zinc-500">Henüz veri girilmedi.</div>}
      <div className="space-y-2">
        {(items || []).slice(0, 5).map((e, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-zinc-500 w-4">{i + 1}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{e.name}</div>
                {e.team && <div className="text-[10px] text-zinc-500 truncate">{e.team}</div>}
              </div>
            </div>
            <span className={`font-heading font-bold ${color}`}>{e.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaderHighlight({ leader }) {
  if (!leader) return null;
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden" data-testid="leader-highlight">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-neon-green/10 blur-2xl rounded-full" />
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-yellow-400" />
        <h4 className="font-heading text-sm uppercase tracking-wide">Lider Takım</h4>
      </div>
      <div className="flex items-center gap-3">
        {leader.logo_url ? (
          <img src={leader.logo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-neon-green/50 shadow-[0_0_14px_rgba(57,255,20,0.4)]" />
        ) : (
          <span className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold">{leader.abbreviation}</span>
        )}
        <div>
          <div className="font-heading font-bold text-lg leading-tight">{leader.name}</div>
          <div className="text-xs text-zinc-400">{leader.P} Puan · {leader.G}G {leader.B}B {leader.M}M</div>
        </div>
      </div>
    </div>
  );
}

export function MagazineFeed({ items, onOpenAll, onSelect }) {
  const navigate = useNavigate();
  const handleSelect = (it) => {
    if (onSelect) return onSelect(it);
    navigate(`/magazine/${it.id}`);
  };
  return (
    <div className="glass rounded-2xl p-4" data-testid="magazine-feed">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-neon-blue" />
          <h4 className="font-heading text-sm uppercase tracking-wide">Magazin / Haberler</h4>
        </div>
        {items && items.length > 0 && (
          <button onClick={onOpenAll} data-testid="magazine-see-all" className="text-[11px] neon-text-blue hover:underline">Tümünü Gör</button>
        )}
      </div>
      {(!items || items.length === 0) && <div className="text-xs text-zinc-500">Henüz haber yok.</div>}
      <div className="space-y-3">
        {(items || []).slice(0, 6).map((it) => (
          <button key={it.id} onClick={() => handleSelect(it)} data-testid={`magazine-item-${it.id}`} className="block w-full text-left border-l-2 border-neon-blue/40 pl-3 hover:border-neon-blue transition-colors">
            {it.video_url ? (
              <div className="relative w-full h-24 rounded-lg mb-2 overflow-hidden bg-black/40 flex items-center justify-center">
                {it.image_url && <img src={it.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                <PlayCircle className="relative w-8 h-8 text-white drop-shadow" />
              </div>
            ) : it.image_url ? (
              <img src={it.image_url} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
            ) : null}
            <div className="font-semibold text-sm flex items-center gap-1.5">{it.video_url && <PlayCircle className="w-3.5 h-3.5 text-neon-blue shrink-0" />}{it.title}</div>
            {it.body && <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">{it.body}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

export { Trophy, Target };
