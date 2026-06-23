import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { ImageUpload } from "./ImageUpload";
import { Trash2, Search, Loader2 } from "lucide-react";
import api from "../lib/api";
import { DEFAULT_PLAYER } from "./PlayerCard";

export function PlayerModal({ open, onClose, slot, player, onSave, onRemove }) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [value, setValue] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setName(player?.name || "");
      setPhoto(player?.photo_url || "");
      setValue(player?.value != null ? String(player.value) : "");
      setQ("");
      setResults([]);
    }
  }, [open, player]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setResults([]); return; }
      setSearching(true);
      try {
        const { data } = await api.get("/players", { params: { q } });
        setResults(data);
      } catch { setResults([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);

  const pick = (p) => {
    setName(`${p.name} ${p.surname}`.trim());
    setPhoto(p.photo_url || "");
    setValue(String(p.value || 0));
    setQ("");
    setResults([]);
  };

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), photo_url: photo, value: parseFloat(value) || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-white sm:max-w-md" data-testid="player-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {slot?.label ? `OYUNCU — ${slot.label}` : "OYUNCU"} {player ? "DÜZENLE" : "EKLE"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Pool search */}
          <div className="relative">
            <span className="label-xs">Havuzdan Ara (admin oyuncuları)</span>
            <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15">
              <Search className="w-4 h-4 text-zinc-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Oyuncu / kulüp ara..." data-testid="pool-search-input" className="bg-transparent outline-none text-sm w-full placeholder:text-zinc-600" />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-neon-blue" />}
            </div>
            {results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full glass-strong rounded-xl overflow-hidden max-h-52 overflow-y-auto thin-scroll">
                {results.map((p) => (
                  <button key={p.id} type="button" onClick={() => pick(p)} data-testid={`pool-result-${p.id}`} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-left">
                    <img src={p.photo_url || DEFAULT_PLAYER} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name} {p.surname}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1">{p.club_logo_url && <img src={p.club_logo_url} alt="" className="w-3 h-3 rounded-full" />}{p.club}</div>
                    </div>
                    <span className="text-xs neon-text-green font-bold">€{p.value}M</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="label-xs">Oyuncu Adı</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Lionel Messi" data-testid="player-name-input" className="mt-1 bg-white/5 border-white/15" />
          </div>
          <ImageUpload value={photo} onChange={setPhoto} label="Oyuncu Fotoğrafı (boş bırakılabilir)" round testid="player-photo" />
          <div>
            <span className="label-xs">Piyasa Değeri (Milyon €)</span>
            <Input type="number" step="0.1" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="örn. 80" data-testid="player-value-input" className="mt-1 bg-white/5 border-white/15" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={save} data-testid="player-save-btn" className="btn-primary flex-1 rounded-full py-2.5">Kaydet</button>
            {player && (
              <button onClick={onRemove} data-testid="player-remove-btn" className="px-4 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
