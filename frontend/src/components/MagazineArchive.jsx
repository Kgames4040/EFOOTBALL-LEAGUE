import React from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Newspaper, ExternalLink } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { MentionChips } from "./MentionChips";
import { MentionText } from "./MentionText";
import { optimizeImage } from "../lib/image";

export function MagazineArchive({ open, onClose, items, initial }) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-white sm:max-w-lg max-h-[85vh] overflow-y-auto thin-scroll" data-testid="magazine-archive">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2"><Newspaper className="w-5 h-5 text-neon-blue" /> TÜM MAGAZİN HABERLERİ</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {(!items || items.length === 0) && <div className="text-sm text-zinc-500">Henüz haber yok.</div>}
          {(items || []).map((it) => (
            <div key={it.id} data-testid={`magazine-archive-item-${it.id}`} className={`glass rounded-2xl p-4 ${initial && initial.id === it.id ? "neon-border-green" : ""}`}>
              {it.video_url ? (
                <div className="mb-3"><VideoPlayer url={it.video_url} /></div>
              ) : it.image_url ? (
                <img src={optimizeImage(it.image_url, { w: 800, h: 450 })} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />
              ) : null}
              <div className="flex items-center gap-2">
                {it.is_leader_highlight && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">LİDER</span>}
                <div className="font-semibold">{it.title}</div>
              </div>
              {it.body && (
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed whitespace-pre-wrap">
                  <MentionText text={it.body} mentions={it.mentions} onNavigate={onClose} />
                </p>
              )}
              <MentionChips mentions={it.mentions} onNavigate={onClose} />
              <div className="flex items-center justify-between mt-3 gap-2">
                {it.created_at && <div className="text-[10px] text-zinc-600">{new Date(it.created_at).toLocaleString("tr-TR")}</div>}
                <button
                  type="button"
                  onClick={() => { onClose(); navigate(`/magazine/${it.id}`); }}
                  data-testid={`magazine-open-detail-${it.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold neon-text-blue hover:underline"
                >
                  Detay Sayfası <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
