import React, { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { FormationPitch } from "../components/FormationPitch";
import { PlayerModal } from "../components/PlayerModal";
import { ImageUpload } from "../components/ImageUpload";
import { CountrySelect } from "../components/CountrySelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { FORMATION_NAMES } from "../lib/formations";
import { flagEmoji } from "../lib/countries";
import { useAuth } from "../context/AuthContext";
import api, { formatError } from "../lib/api";
import { Save, Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

let benchSeq = 0;

export default function MyTeam() {
  const { loadTeam } = useAuth();
  const [team, setTeam] = useState(null);
  const [formation, setFormation] = useState("4-3-3");
  const [roster, setRoster] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // {slot, player, isBench}
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    api.get("/teams/me").then((t) => {
      setTeam(t.data);
      setFormation(t.data.formation || "4-3-3");
      setRoster(t.data.players || []);
    });
  }, []);

  const total = Math.round(roster.reduce((a, p) => a + (parseFloat(p.value) || 0), 0) * 10) / 10;
  const bench = roster.filter((p) => p.bench);

  const savePlayer = (data) => {
    setRoster((prev) => {
      if (editing.player) {
        return prev.map((p) => (p.id === editing.player.id ? { ...p, ...data } : p));
      }
      const np = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...data,
        bench: editing.isBench,
        slot: editing.isBench ? `B${++benchSeq}` : editing.slot.key,
      };
      // replace existing starter in same slot
      if (!editing.isBench) {
        return [...prev.filter((p) => p.slot !== editing.slot.key || p.bench), np];
      }
      return [...prev, np];
    });
    setEditing(null);
  };

  const removePlayer = () => {
    setRoster((prev) => prev.filter((p) => p.id !== editing.player.id));
    setEditing(null);
  };

  const saveSquad = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/teams/me/squad", { formation, players: roster });
      setTeam(data);
      await loadTeam();
      toast.success("Kadro kaydedildi!");
    } catch (e) {
      toast.error(formatError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  if (!team) return <Layout><div className="text-center text-zinc-500 py-20">Yükleniyor...</div></Layout>;

  return (
    <Layout>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl">{team.name}</h1>
          <button onClick={() => setShowInfo(true)} data-testid="edit-team-info-btn" className="text-sm text-zinc-400 hover:text-neon-blue flex items-center gap-1 mt-1">
            <Pencil className="w-3 h-3" /> Takım & TD bilgilerini düzenle
          </button>
        </div>
        {/* Total value indicator */}
        <div className="glass rounded-2xl px-5 py-3" data-testid="value-indicator">
          <div className="label-xs">Toplam Takım Değeri</div>
          <div className="font-heading text-xl neon-text-green">€{total}M</div>
        </div>
      </div>

      {/* Formation selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        {FORMATION_NAMES.map((f) => (
          <button
            key={f}
            onClick={() => setFormation(f)}
            data-testid={`formation-${f}`}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              formation === f ? "btn-primary" : "glass text-zinc-300 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FormationPitch
            formation={formation}
            players={roster}
            onSlotClick={(slot, player) => setEditing({ slot, player, isBench: false })}
          />
        </div>

        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg">Yedekler</h3>
            <button onClick={() => setEditing({ slot: null, player: null, isBench: true })} data-testid="add-bench-btn" className="btn-primary rounded-full px-3 py-1.5 text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </div>
          {bench.length === 0 ? (
            <div className="text-sm text-zinc-500">Yedek oyuncu ekleyin.</div>
          ) : (
            <div className="space-y-2">
              {bench.map((p) => (
                <button key={p.id} onClick={() => setEditing({ slot: null, player: p, isBench: true })} className="w-full flex items-center justify-between glass rounded-xl px-3 py-2 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <img src={p.photo_url || "/player-default.png"} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <span className="text-xs neon-text-green font-bold">€{p.value}M</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={saveSquad} disabled={saving} data-testid="save-squad-btn" className="btn-primary rounded-full px-8 py-3 flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kadroyu Kaydet
        </button>
      </div>

      <PlayerModal
        open={!!editing}
        onClose={() => setEditing(null)}
        slot={editing?.slot}
        player={editing?.player}
        onSave={savePlayer}
        onRemove={removePlayer}
      />

      <TeamInfoDialog open={showInfo} onClose={() => setShowInfo(false)} team={team} onSaved={(t) => { setTeam(t); loadTeam(); }} />
    </Layout>
  );
}

function TeamInfoDialog({ open, onClose, team, onSaved }) {
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [logo, setLogo] = useState("");
  const [desc, setDesc] = useState("");
  const [m, setM] = useState({});
  const [country, setCountry] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && team) {
      setName(team.name); setAbbr(team.abbreviation); setLogo(team.logo_url || ""); setDesc(team.description || "");
      setM(team.manager || {});
      setCountry(team.manager?.nationality ? { name: team.manager.nationality } : null);
    }
  }, [open, team]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/teams/me/info", {
        name, abbreviation: abbr, logo_url: logo, description: desc,
        manager: { ...m, nationality: country?.name || m.nationality || "", flag: country?.code ? flagEmoji(country.code) : m.flag || "" },
      });
      onSaved(data);
      toast.success("Bilgiler güncellendi");
      onClose();
    } catch (e) {
      toast.error(formatError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-white sm:max-w-lg max-h-[85vh] overflow-y-auto thin-scroll" data-testid="team-info-dialog">
        <DialogHeader><DialogTitle className="font-heading">Takım & Teknik Direktör</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <ImageUpload value={logo} onChange={setLogo} label="Logo" round testid="edit-logo" />
            <ImageUpload value={m.photo_url} onChange={(u) => setM({ ...m, photo_url: u })} label="TD Foto" round testid="edit-mgr-photo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="label-xs">Takım Adı</span><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 bg-white/5 border-white/15" /></div>
            <div><span className="label-xs">Kısaltma</span><Input value={abbr} maxLength={3} onChange={(e) => setAbbr(e.target.value.toUpperCase().slice(0, 3))} className="mt-1 bg-white/5 border-white/15 uppercase" /></div>
            <div><span className="label-xs">TD İsim</span><Input value={m.name || ""} onChange={(e) => setM({ ...m, name: e.target.value })} className="mt-1 bg-white/5 border-white/15" /></div>
            <div><span className="label-xs">Doğum T.</span><Input type="date" value={m.birthdate || ""} onChange={(e) => setM({ ...m, birthdate: e.target.value })} className="mt-1 bg-white/5 border-white/15" /></div>
            <div><span className="label-xs">Memleket</span><Input value={m.hometown || ""} onChange={(e) => setM({ ...m, hometown: e.target.value })} className="mt-1 bg-white/5 border-white/15" /></div>
            <div><span className="label-xs">Vatandaşlık</span><div className="mt-1"><CountrySelect value={country?.name} onChange={setCountry} testid="edit-country" /></div></div>
          </div>
          <div><span className="label-xs">Açıklama</span><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 bg-white/5 border-white/15" rows={2} /></div>
          <button onClick={save} disabled={saving} data-testid="save-team-info-btn" className="btn-primary w-full rounded-full py-2.5">Kaydet</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
