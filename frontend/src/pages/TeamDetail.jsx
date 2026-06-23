import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { FormationPitch } from "../components/FormationPitch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import api from "../lib/api";
import { ArrowLeft, Shield } from "lucide-react";

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [showManager, setShowManager] = useState(false);
  const [selPlayer, setSelPlayer] = useState(null);

  useEffect(() => {
    api.get(`/teams/${id}`).then((r) => setTeam(r.data)).catch(() => setTeam(false));
  }, [id]);

  if (team === false) return <Layout><div className="text-center text-zinc-500 py-20">Takım bulunamadı.</div></Layout>;
  if (!team) return <Layout><div className="text-center text-zinc-500 py-20">Yükleniyor...</div></Layout>;

  const bench = (team.players || []).filter((p) => p.bench);
  const manager = team.manager || {};

  return (
    <Layout>
      <button onClick={() => navigate("/teams")} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 text-sm" data-testid="back-to-teams">
        <ArrowLeft className="w-4 h-4" /> Takımlar
      </button>

      <div className="glass rounded-3xl p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {team.logo_url ? (
            <img src={team.logo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-neon-blue/50" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center font-heading font-bold text-xl">{team.abbreviation}</div>
          )}
          <div>
            <h1 className="font-heading font-extrabold text-2xl">{team.name}</h1>
            <p className="text-zinc-400 text-sm">{team.abbreviation} · {team.formation}</p>
            {team.description && <p className="text-zinc-500 text-xs mt-1 max-w-md">{team.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(manager.name || manager.photo_url) && (
            <button onClick={() => setShowManager(true)} data-testid="manager-trigger" className="flex items-center gap-2 glass rounded-full pl-1 pr-4 py-1 hover:bg-white/10 transition-colors">
              {manager.photo_url ? (
                <img src={manager.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Shield className="w-4 h-4" /></div>
              )}
              <div className="text-left">
                <div className="label-xs">Teknik Direktör</div>
                <div className="text-sm font-medium">{manager.name} {manager.flag}</div>
              </div>
            </button>
          )}
          <div className="text-right">
            <div className="label-xs">Toplam Değer</div>
            <div className="font-heading font-bold neon-text-green text-lg">€{team.value}M</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-3xl p-5">
          <h3 className="font-heading text-lg mb-4">Diziliş — {team.formation}</h3>
          <FormationPitch formation={team.formation} players={team.players} onSlotClick={(slot, p) => p && setSelPlayer({ ...p, isGK: slot.key === "GK" })} />
        </div>
        <div className="glass rounded-3xl p-5">
          <h3 className="font-heading text-lg mb-4">Yedekler</h3>
          {bench.length === 0 ? (
            <div className="text-sm text-zinc-500">Yedek oyuncu yok.</div>
          ) : (
            <div className="space-y-2">
              {bench.map((p) => (
                <button key={p.id} onClick={() => setSelPlayer({ ...p, isGK: false })} className="w-full flex items-center justify-between glass rounded-xl px-3 py-2 hover:bg-white/10 transition-colors">
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

      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent className="glass-strong border-white/10 text-white sm:max-w-sm" data-testid="manager-profile-modal">
          <DialogHeader><DialogTitle className="font-heading">Teknik Direktör Profili</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center text-center">
            {manager.photo_url ? (
              <img src={manager.photo_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-neon-blue/50 mb-3" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-3"><Shield className="w-8 h-8" /></div>
            )}
            <div className="font-heading font-bold text-xl">{manager.name || "—"}</div>
            <div className="text-3xl my-1">{manager.flag}</div>
            <div className="grid grid-cols-2 gap-3 mt-3 w-full text-left">
              <Info label="Vatandaşlık" value={manager.nationality} />
              <Info label="Memleket" value={manager.hometown} />
              <Info label="Doğum Tarihi" value={manager.birthdate} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selPlayer} onOpenChange={(v) => !v && setSelPlayer(null)}>
        <DialogContent className="glass-strong border-white/10 text-white sm:max-w-xs" data-testid="player-info-modal">
          <DialogHeader><DialogTitle className="font-heading text-xl">OYUNCU BİLGİSİ</DialogTitle></DialogHeader>
          {selPlayer && (
            <div className="flex flex-col items-center text-center">
              <img src={selPlayer.photo_url || (selPlayer.isGK ? "/gk-default.png" : "/player-default.png")} alt="" className="w-28 h-28 rounded-full object-cover border-2 border-neon-blue/50 mb-3" />
              <div className="font-heading text-2xl">{selPlayer.name}</div>
              <div className="mt-2 glass rounded-xl px-4 py-2">
                <div className="label-xs">Piyasa Değeri</div>
                <div className="neon-text-green font-heading text-xl">€{selPlayer.value}M</div>
              </div>
              {selPlayer.bench && <span className="mt-2 text-xs text-zinc-500">Yedek oyuncu</span>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function Info({ label, value }) {
  return (
    <div className="glass rounded-xl px-3 py-2">
      <div className="label-xs">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}
