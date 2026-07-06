import React, { useEffect, useState, useRef } from "react";
import { Layout } from "../components/Layout";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { ImageUpload } from "../components/ImageUpload";
import { VideoUpload } from "../components/VideoUpload";
import { CancelMatchDialog } from "../components/CancelMatchDialog";
import { PlayerModal } from "../components/PlayerModal";
import { CountrySelect } from "../components/CountrySelect";
import { flagEmoji } from "../lib/countries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { StandingsTable } from "../components/StandingsTable";
import { useConfirm } from "../components/ConfirmProvider";
import { useAuth } from "../context/AuthContext";
import BettingAdminPanel from "../components/BettingAdminPanel";
import api, { formatError } from "../lib/api";
import html2canvas from "html2canvas";
import {
  Trophy, PlayCircle, PauseCircle, Trash2, Shuffle, Plus, Save, Download,
  Flag, FlagOff, Pencil, X, Loader2, ShieldHalf, UserCog, Palette, Shield, Crown, XCircle, AtSign,
} from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    api.get("/tournament/active").then((r) => setTournament(r.data));
  }, [refreshKey]);

  const isCup = tournament?.mode === "cup";
  const isFounder = user?.role === "founder";

  // Admin (match-assigned) sees only their match panel
  if (user?.role === "admin") {
    return (
      <Layout>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl mb-6 flex items-center gap-2">
          <Shield className="w-7 h-7 text-neon-blue" /> Admin Paneli
        </h1>
        <AdminMatchPanel user={user} tournament={tournament} />
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="font-heading font-extrabold text-2xl sm:text-3xl mb-6 flex items-center gap-2">
        <Crown className="w-7 h-7 text-yellow-400" /> Kurucu Paneli
      </h1>
      <Tabs defaultValue="tournament">
        <TabsList className="glass rounded-full p-1 flex-wrap h-auto gap-1 mb-6">
          {(isCup
            ? [["tournament", "Turnuva"], ["cup", "Kupa"], ["exhibition", "Gösteri Maçı"], ["players", "Oyuncu Havuzu"], ["magazine", "Magazin"], ["users", "Kullanıcılar"], ["roles", "Roller"], ["branding", "Marka"], ["betting", "🎲 Bahis"]]
            : [["tournament", "Turnuva"], ["fixture", "Fikstür"], ["matches", "Maçlar"], ["exhibition", "Gösteri Maçı"], ["players", "Oyuncu Havuzu"], ["magazine", "Magazin"], ["users", "Kullanıcılar"], ["roles", "Roller"], ["branding", "Marka"], ["summary", "Günün Özeti"], ["betting", "🎲 Bahis"]]
          ).map(([v, l]) => (
            <TabsTrigger key={v} value={v} data-testid={`admin-tab-${v}`} className="rounded-full data-[state=active]:btn-primary data-[state=active]:text-black text-sm px-4">{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tournament"><TournamentTab tournament={tournament} onChange={refresh} /></TabsContent>
        {isCup ? (
          <TabsContent value="cup"><CupTab key={refreshKey} tournament={tournament} onChange={refresh} /></TabsContent>
        ) : (
          <>
            <TabsContent value="fixture"><FixtureTab tournament={tournament} onChange={refresh} /></TabsContent>
            <TabsContent value="matches"><MatchesTab key={refreshKey} tournament={tournament} /></TabsContent>
            <TabsContent value="summary"><SummaryTab /></TabsContent>
          </>
        )}
        <TabsContent value="players"><PlayersTab /></TabsContent>
        <TabsContent value="exhibition"><ExhibitionTab /></TabsContent>
        <TabsContent value="magazine"><MagazineTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="roles"><RolesTab tournament={tournament} /></TabsContent>
        <TabsContent value="branding"><BrandingTab /></TabsContent>
        <TabsContent value="betting"><BettingAdminPanel /></TabsContent>
      </Tabs>
    </Layout>
  );
}

function Section({ title, children }) {
  return (
    <div className="glass rounded-3xl p-6">
      {title && <h3 className="font-heading text-lg mb-4">{title}</h3>}
      {children}
    </div>
  );
}

/* ---------------- Tournament ---------------- */
function TournamentTab({ tournament, onChange }) {
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [cover, setCover] = useState("");
  const [squareLogo, setSquareLogo] = useState("");
  const [mode, setMode] = useState("league");
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const start = async () => {
    if (!name.trim()) return toast.error(mode === "cup" ? "Kupa adı gerekli" : "Turnuva adı gerekli");
    setBusy(true);
    try {
      await api.post("/admin/tournament", { name, weeks: parseInt(weeks) || 1, cover_url: cover, square_logo_url: squareLogo, mode });
      toast.success(mode === "cup" ? "Kupa başlatıldı! Şimdi çekiliş yapın." : "Turnuva başlatıldı!");
      onChange();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setBusy(false); }
  };

  const action = async (path, msg) => {
    try { await api.post(path); toast.success(msg); onChange(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const del = async () => {
    const ok = await confirm({
      title: "Turnuva/Kupa tamamen silinsin mi?",
      description: "Turnuva/Kupa, fikstür, maç sonuçları ve istatistikler tamamen silinecek. Takımlar korunur.",
      confirmText: "Evet, Sil",
    });
    if (!ok) return;
    try { await api.delete("/admin/tournament"); toast.success("Silindi"); onChange(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  if (tournament) {
    const isCup = tournament.mode === "cup";
    return (
      <Section title={isCup ? "Aktif Kupa" : "Aktif Turnuva"}>
        <div className="flex items-center gap-4 mb-6">
          {tournament.cover_url && <img src={tournament.cover_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />}
          <div>
            <div className="font-heading font-bold text-2xl flex items-center gap-2">
              {tournament.name}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isCup ? "border-neon-blue/40 neon-text-blue" : "border-neon-green/40 neon-text-green"}`}>{isCup ? "KUPA" : "LİG"}</span>
            </div>
            <div className="text-sm text-zinc-400">
              {isCup ? "Eleme usulü" : `${tournament.weeks} hafta`} · Durum: <span className={tournament.status === "paused" ? "text-yellow-400" : "neon-text-green"}>{tournament.status === "paused" ? "Durduruldu" : tournament.status === "finished" ? "Tamamlandı" : "Aktif"}</span>
            </div>
          </div>
        </div>
        {isCup && <p className="text-sm text-zinc-400 mb-4">Eşleşmeleri oluşturmak ve sonuç girmek için <span className="neon-text-blue font-semibold">Kupa</span> sekmesini kullanın.</p>}
        <div className="flex flex-wrap gap-3">
          {tournament.status === "paused" ? (
            <button onClick={() => action("/admin/tournament/resume", "Devam ettirildi")} data-testid="resume-btn" className="btn-primary rounded-full px-5 py-2.5 flex items-center gap-2"><PlayCircle className="w-4 h-4" /> Devam Ettir</button>
          ) : (
            <button onClick={() => action("/admin/tournament/pause", "Durduruldu")} data-testid="pause-btn" className="rounded-full px-5 py-2.5 flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/25 transition-colors"><PauseCircle className="w-4 h-4" /> Durdur</button>
          )}
          <button onClick={() => setEditOpen(true)} data-testid="edit-tournament-btn" className="rounded-full px-5 py-2.5 flex items-center gap-2 bg-neon-blue/15 border border-neon-blue/40 neon-text-blue hover:bg-neon-blue/25 transition-colors"><Pencil className="w-4 h-4" /> Düzenle</button>
          <button onClick={del} data-testid="delete-tournament-btn" className="rounded-full px-5 py-2.5 flex items-center gap-2 bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors"><Trash2 className="w-4 h-4" /> Tamamen Sil</button>
        </div>

        <EditTournamentDialog open={editOpen} onClose={() => setEditOpen(false)} tournament={tournament} onSaved={onChange} />
      </Section>
    );
  }

  return (
    <Section title="Yeni Başlat">
      <div className="space-y-4 max-w-md">
        <div>
          <span className="label-xs">Mod Seç</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button type="button" onClick={() => setMode("league")} data-testid="mode-league-btn" className={`rounded-xl px-4 py-3 text-sm font-bold border transition-all ${mode === "league" ? "btn-primary border-transparent" : "glass border-white/15 text-zinc-300"}`}>
              <Trophy className="w-4 h-4 inline mr-1" /> Turnuva (Lig)
            </button>
            <button type="button" onClick={() => setMode("cup")} data-testid="mode-cup-btn" className={`rounded-xl px-4 py-3 text-sm font-bold border transition-all ${mode === "cup" ? "btn-primary border-transparent" : "glass border-white/15 text-zinc-300"}`}>
              <ShieldHalf className="w-4 h-4 inline mr-1" /> Kupa (Eleme)
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">{mode === "cup" ? "UCL mantığında tek maç eleme. Takımlar rastgele eşleşir, kazanan üst tura çıkar." : "Çift devreli lig: herkes herkesle 2 kez oynar."}</p>
        </div>
        <div><span className="label-xs">{mode === "cup" ? "Kupa Adı" : "Turnuva Adı"}</span><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === "cup" ? "Örn. Neon Kupası" : "Örn. Neon Ligi 2026"} data-testid="tournament-name-input" className="mt-1 bg-white/5 border-white/15" /></div>
        {mode === "league" && (
          <div><span className="label-xs">Kaç Hafta</span><Input type="number" min={1} value={weeks} onChange={(e) => setWeeks(e.target.value)} data-testid="tournament-weeks-input" className="mt-1 bg-white/5 border-white/15" /></div>
        )}
        <ImageUpload value={cover} onChange={setCover} label="Geniş Arka Plan Görseli (banner)" testid="tournament-cover" />
        <ImageUpload value={squareLogo} onChange={setSquareLogo} label="Kare Logo (soldaki küçük görsel)" testid="tournament-square" />
        <p className="text-[10px] text-zinc-500 -mt-2">İki görsel de aspect-ratio kilidi olmadan otomatik ölçeklenir; kareye kare, banner'a geniş yükleyebilirsin.</p>
        <button onClick={start} disabled={busy} data-testid="start-tournament-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} {mode === "cup" ? "Kupayı Başlat" : "Turnuvayı Başlat"}</button>
      </div>
    </Section>
  );
}

function EditTournamentDialog({ open, onClose, tournament, onSaved }) {
  const [name, setName] = useState("");
  const [cover, setCover] = useState("");
  const [squareLogo, setSquareLogo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && tournament) {
      setName(tournament.name || "");
      setCover(tournament.cover_url || "");
      setSquareLogo(tournament.square_logo_url || "");
    }
  }, [open, tournament]);

  const save = async () => {
    if (!name.trim()) return toast.error("İsim boş olamaz");
    setBusy(true);
    try {
      await api.put("/admin/tournament", { name: name.trim(), cover_url: cover || "", square_logo_url: squareLogo || "" });
      toast.success("Turnuva güncellendi");
      onSaved && onSaved();
      onClose();
    } catch (e) {
      toast.error(formatError(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-white sm:max-w-lg" data-testid="edit-tournament-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Pencil className="w-5 h-5 text-neon-blue" /> Turnuvayı Düzenle
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <span className="label-xs">Turnuva Adı</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="edit-tournament-name-input"
              className="mt-1 bg-white/5 border-white/15"
            />
          </div>
          <ImageUpload value={cover} onChange={setCover} label="Geniş Arka Plan Görseli (banner)" testid="edit-tournament-cover" />
          <ImageUpload value={squareLogo} onChange={setSquareLogo} label="Kare Logo (soldaki küçük görsel)" testid="edit-tournament-square" />
          <p className="text-[10px] text-zinc-500 -mt-2">Her iki görsel de aspect-ratio kilitli değil; otomatik olarak ölçeklenir.</p>          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm bg-white/5 hover:bg-white/10"
            >
              İptal
            </button>
            <button
              onClick={save}
              disabled={busy}
              data-testid="save-tournament-edit-btn"
              className="btn-primary rounded-full px-5 py-2 flex items-center gap-2 text-sm"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/* ---------------- Cup Management ---------------- */
function CupTab({ tournament, onChange }) {
  const confirm = useConfirm();
  const [bracket, setBracket] = useState(null);
  const [inputs, setInputs] = useState({}); // { matchId: {home, away, pen} }
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = () => api.get("/cup/bracket").then((r) => setBracket(r.data));
  useEffect(() => { load(); }, []);

  if (!tournament) return <Section><div className="text-zinc-400">Aktif kupa yok.</div></Section>;

  const rounds = bracket?.rounds || [];
  const finished = tournament.status === "finished" || !!bracket?.champion;
  const lastRound = rounds.length ? rounds[rounds.length - 1] : null;

  const draw = async () => {
    const ok = await confirm({
      title: "Kupa çekilişi yapılsın mı?",
      description: "Tüm takımlar rastgele eşleştirilecek (tek takım kalırsa bay geçer). Mevcut kupa eşleşmeleri silinir.",
      confirmText: "Çekilişi Yap", danger: false,
    });
    if (!ok) return;
    setBusy(true);
    try { const { data } = await api.post("/admin/cup/draw"); toast.success(`Çekiliş yapıldı · ${data.teams} takım`); await load(); onChange(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setBusy(false); }
  };

  const reset = async () => {
    const ok = await confirm({
      title: "Kupa sıfırlansın mı?",
      description: "Kupa tamamen sıfırlanıp tüm eşleşmeler silinecek.",
      confirmText: "Evet, Sıfırla",
    });
    if (!ok) return;
    setBusy(true);
    try { await api.post("/admin/cup/reset"); toast.success("Kupa sıfırlandı"); setBracket({ rounds: [] }); onChange(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setBusy(false); }
  };

  const setVal = (id, k, v) => setInputs((s) => ({ ...s, [id]: { ...s[id], [k]: v } }));

  const start = async (m) => {
    try { await api.post(`/admin/cup/match/${m.id}/start`); toast.success("Maç başlatıldı, bildirim gönderildi"); await load(); onChange(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const submit = async (m) => {
    const s = inputs[m.id] || {};
    const hs = parseInt(s.home ?? m.home_score ?? 0);
    const as_ = parseInt(s.away ?? m.away_score ?? 0);
    const body = { home_score: hs, away_score: as_ };
    if (hs === as_) {
      const pen = s.pen ?? m.pen_winner_team_id;
      if (!pen) return toast.error("Berabere skor: penaltı galibini seçin");
      body.pen_winner_team_id = pen;
    }
    try {
      await api.post(`/admin/cup/match/${m.id}/result`, body);
      toast.success("Sonuç kaydedildi");
      await load(); onChange();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-5">
      <Section title="Kupa Yönetimi">
        {rounds.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">Henüz çekiliş yapılmadı. Tüm takımlar rastgele 2'şerli eşleşecek; takım sayısı tekse bir takım otomatik tur atlar.</p>
            <button onClick={draw} disabled={busy} data-testid="cup-draw-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2"><Shuffle className="w-4 h-4" /> Kupa Çekilişi Yap</button>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-zinc-400">
              {finished ? <span className="neon-text-green font-semibold flex items-center gap-1"><Trophy className="w-4 h-4 text-yellow-400" /> Kupa tamamlandı · Şampiyon: {bracket?.champion?.name}</span> : `Aktif tur: ${lastRound?.label}`}
            </div>
            <button onClick={reset} disabled={busy} data-testid="cup-reset-btn" className="rounded-full px-4 py-2 text-sm bg-red-500/15 border border-red-500/40 text-red-300 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Kupayı Sıfırla</button>
          </div>
        )}
      </Section>

      {rounds.map((r) => {
        const editable = !finished && lastRound && r.round === lastRound.round;
        return (
          <Section key={r.round} title={`${r.round}. Tur · ${r.label}${r.complete ? " ✓" : ""}`}>
            <div className="space-y-3">
              {r.matches.map((m) => {
                const s = inputs[m.id] || {};
                const hs = s.home ?? m.home_score ?? "";
                const as_ = s.away ?? m.away_score ?? "";
                const isDraw = hs !== "" && as_ !== "" && parseInt(hs) === parseInt(as_);
                const homeWin = m.winner_team_id && m.home && m.winner_team_id === m.home.id;
                const awayWin = m.winner_team_id && m.away && m.winner_team_id === m.away.id;
                return (
                  <div key={m.id} data-testid={`cup-admin-match-${m.id}`} className="glass rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-[160px] flex-1">
                        <span className={`font-heading font-bold ${homeWin ? "neon-text-green" : ""}`}>{m.home?.abbreviation}</span>
                        <span className="text-zinc-500 text-xs">vs</span>
                        <span className={`font-heading font-bold ${awayWin ? "neon-text-green" : ""}`}>{m.bye ? "—" : m.away?.abbreviation}</span>
                        {m.bye && <span className="text-[10px] neon-text-green ml-1">BAY · Tur Atladı</span>}
                        {!m.bye && m.status === "live" && <span className="text-[10px] neon-text-green animate-pulse-glow ml-1">CANLI</span>}
                        {!m.bye && m.status === "finished" && <span className="text-sm ml-1 text-zinc-300">{m.home_score}-{m.away_score}{m.pen_winner_team_id ? " (P)" : ""}</span>}
                        {!m.bye && m.status === "canceled" && <span className="text-[10px] text-red-400 ml-1">İPTAL{m.cancel_reason ? ` · ${m.cancel_reason}` : ""}</span>}
                      </div>
                      {!m.bye && editable && m.status === "scheduled" && (
                        <button onClick={() => start(m)} data-testid={`cup-start-${m.id}`} className="btn-primary rounded-full px-4 py-1.5 text-sm flex items-center gap-1"><Flag className="w-3.5 h-3.5" /> Başlat</button>
                      )}
                      {!m.bye && editable && m.status !== "finished" && m.status !== "canceled" && (
                        <button onClick={() => setCancelTarget(m)} data-testid={`cup-cancel-${m.id}`} title="Maçı iptal et" className="rounded-full p-1.5 bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors"><X className="w-4 h-4" /></button>
                      )}
                      {!m.bye && editable && (m.status === "live" || m.status === "finished") && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input type="number" min={0} value={hs} onChange={(e) => setVal(m.id, "home", e.target.value)} className="w-14 bg-white/5 border-white/15 h-9 text-center" data-testid={`cup-home-${m.id}`} />
                          <span className="text-zinc-500">-</span>
                          <Input type="number" min={0} value={as_} onChange={(e) => setVal(m.id, "away", e.target.value)} className="w-14 bg-white/5 border-white/15 h-9 text-center" data-testid={`cup-away-${m.id}`} />
                          <button onClick={() => submit(m)} data-testid={`cup-save-${m.id}`} className={`rounded-full px-4 py-1.5 text-sm flex items-center gap-1 ${m.status === "finished" ? "bg-white/10 border border-white/20" : "bg-neon-green/15 border border-neon-green/40 text-neon-green"}`}>
                            {m.status === "finished" ? <><Pencil className="w-3.5 h-3.5" /> Güncelle</> : <><FlagOff className="w-3.5 h-3.5" /> Bitir</>}
                          </button>
                        </div>
                      )}
                    </div>
                    {!m.bye && editable && isDraw && (
                      <div className="mt-2 flex items-center gap-3 flex-wrap bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                        <span className="text-xs text-yellow-300 font-semibold">Berabere! Penaltı galibi:</span>
                        {[m.home, m.away].map((tm) => tm && (
                          <label key={tm.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input type="radio" name={`pen-${m.id}`} checked={(s.pen ?? m.pen_winner_team_id) === tm.id} onChange={() => setVal(m.id, "pen", tm.id)} data-testid={`cup-pen-${m.id}-${tm.id}`} />
                            {tm.abbreviation}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })}
      <CancelMatchDialog open={!!cancelTarget} match={cancelTarget} mode="cup" onClose={() => setCancelTarget(null)} onDone={async () => { await load(); onChange(); }} />
    </div>
  );
}

/* ---------------- Fixture ---------------- */
function FixtureTab({ tournament, onChange }) {
  const confirm = useConfirm();
  const [teams, setTeams] = useState([]);
  const [list, setList] = useState([]);
  const [week, setWeek] = useState(1);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/teams").then((r) => setTeams(r.data)); }, []);

  const random = async () => {
    const ok = await confirm({
      title: "Rastgele fikstür oluşturulsun mu?",
      description: "Mevcut fikstür silinip rastgele yeniden oluşturulacak.",
      confirmText: "Oluştur", danger: false,
    });
    if (!ok) return;
    setBusy(true);
    try { const { data } = await api.post("/admin/fixture/random"); toast.success(`${data.created} maç, ${data.weeks} hafta oluşturuldu`); onChange(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setBusy(false); }
  };

  const addManual = () => {
    if (!home || !away || home === away) return toast.error("Farklı iki takım seçin");
    setList([...list, { week: parseInt(week), home_team_id: home, away_team_id: away, scheduled_time: time }]);
    setHome(""); setAway(""); setTime("");
  };

  const submitManual = async () => {
    if (list.length === 0) return toast.error("Maç ekleyin");
    setBusy(true);
    try { await api.post("/admin/fixture/manual", { matches: list }); toast.success("Fikstür oluşturuldu"); setList([]); onChange(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setBusy(false); }
  };

  const teamName = (id) => teams.find((t) => t.id === id)?.abbreviation || "?";

  if (!tournament) return <Section><div className="text-zinc-400">Önce bir turnuva başlatın.</div></Section>;

  return (
    <div className="space-y-6">
      <Section title="Rastgele Fikstür">
        <p className="text-sm text-zinc-400 mb-3">Çift devreli lig: her takım diğer tüm takımlarla 2 kez (ev+deplasman) eşleşir; aynı eşleşmeler asla art arda haftalarda olmaz ({teams.length} takım).</p>
        <button onClick={random} disabled={busy} data-testid="random-fixture-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2"><Shuffle className="w-4 h-4" /> Rastgele Oluştur</button>
      </Section>

      <Section title="Manuel Fikstür">
        <div className="grid sm:grid-cols-5 gap-3 items-end">
          <div><span className="label-xs">Hafta</span><Input type="number" min={1} value={week} onChange={(e) => setWeek(e.target.value)} className="mt-1 bg-white/5 border-white/15" /></div>
          <div><span className="label-xs">Ev Sahibi</span><select value={home} onChange={(e) => setHome(e.target.value)} data-testid="manual-home-select" className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-2 py-2 text-sm"><option value="">Seç</option>{teams.map((t) => <option key={t.id} value={t.id} className="bg-ink-800">{t.name}</option>)}</select></div>
          <div><span className="label-xs">Deplasman</span><select value={away} onChange={(e) => setAway(e.target.value)} data-testid="manual-away-select" className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-2 py-2 text-sm"><option value="">Seç</option>{teams.map((t) => <option key={t.id} value={t.id} className="bg-ink-800">{t.name}</option>)}</select></div>
          <div><span className="label-xs">Saat</span><Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="20:00" className="mt-1 bg-white/5 border-white/15" /></div>
          <button onClick={addManual} data-testid="add-manual-match-btn" className="btn-primary rounded-full px-4 py-2.5 flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> Ekle</button>
        </div>
        {list.length > 0 && (
          <div className="mt-4 space-y-2">
            {list.map((m, i) => (
              <div key={i} className="flex items-center justify-between glass rounded-xl px-3 py-2 text-sm">
                <span>{m.week}. Hafta · {teamName(m.home_team_id)} vs {teamName(m.away_team_id)} {m.scheduled_time && `· ${m.scheduled_time}`}</span>
                <button onClick={() => setList(list.filter((_, j) => j !== i))} className="text-red-400"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={submitManual} disabled={busy} data-testid="submit-manual-fixture-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2 mt-2"><Save className="w-4 h-4" /> Fikstürü Kaydet ({list.length})</button>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ---------------- Matches ---------------- */
function MatchesTab({ tournament }) {
  const [matches, setMatches] = useState([]);
  const [scores, setScores] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = () => api.get("/matches").then((r) => setMatches(r.data));
  useEffect(() => { load(); }, []);

  const setScore = (id, k, v) => setScores((s) => ({ ...s, [id]: { ...s[id], [k]: v } }));

  const start = async (m) => {
    try { await api.post(`/admin/matches/${m.id}/start`); toast.success("Maç başlatıldı, bildirim gönderildi"); load(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  const finish = async (m) => {
    const s = scores[m.id] || {};
    const hs = parseInt(s.home ?? m.home_score ?? 0);
    const as_ = parseInt(s.away ?? m.away_score ?? 0);
    const hc = s.home_c != null && s.home_c !== "" ? parseInt(s.home_c) : (m.home_corners ?? null);
    const ac = s.away_c != null && s.away_c !== "" ? parseInt(s.away_c) : (m.away_corners ?? null);
    if (hc == null || ac == null || isNaN(hc) || isNaN(ac)) { toast.error("Korner sayılarını (ev/dep) girin"); return; }
    try {
      await api.post(`/admin/matches/${m.id}/finish`, { home_score: hs, away_score: as_, home_corners: hc, away_corners: ac });
      toast.success("Maç bitti, bahisler değerlendirildi, bildirim gönderildi"); load();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  const edit = async (m) => {
    const s = scores[m.id] || {};
    const body = {
      home_score: s.home != null ? parseInt(s.home) : m.home_score,
      away_score: s.away != null ? parseInt(s.away) : m.away_score,
    };
    if (s.home_c != null && s.home_c !== "") body.home_corners = parseInt(s.home_c);
    if (s.away_c != null && s.away_c !== "") body.away_corners = parseInt(s.away_c);
    try {
      await api.put(`/admin/matches/${m.id}`, body);
      toast.success("Skor güncellendi"); load();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  if (!tournament) return <Section><div className="text-zinc-400">Aktif turnuva yok.</div></Section>;
  if (matches.length === 0) return <Section><div className="text-zinc-400">Fikstür oluşturun.</div></Section>;

  const weeks = [...new Set(matches.map((m) => m.week))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {weeks.map((w) => (
        <Section key={w} title={`${w}. Hafta`}>
          <div className="space-y-3">
            {matches.filter((m) => m.week === w).map((m) => (
              <div key={m.id} data-testid={`admin-match-${m.id}`} className="flex items-center justify-between gap-3 flex-wrap glass rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 min-w-[180px]">
                  <span className="font-heading font-bold">{m.home.abbreviation}</span>
                  <span className="text-zinc-500">vs</span>
                  <span className="font-heading font-bold">{m.away.abbreviation}</span>
                  {m.status === "live" && <span className="text-[10px] neon-text-green animate-pulse-glow ml-2">CANLI</span>}
                  {m.status === "finished" && <span className="text-sm ml-2">{m.home_score}-{m.away_score}</span>}
                  {m.status === "canceled" && <span className="text-[10px] text-red-400 ml-2">İPTAL</span>}
                </div>
                {m.status === "canceled" ? (
                  <div className="text-xs text-red-300/80 flex-1 min-w-[120px]">İptal edildi{m.cancel_reason ? ` · ${m.cancel_reason}` : ""}</div>
                ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="number" min={0} placeholder="0" defaultValue={m.home_score ?? ""} onChange={(e) => setScore(m.id, "home", e.target.value)} className="w-14 bg-white/5 border-white/15 h-9 text-center" data-testid={`score-home-${m.id}`} />
                  <span className="text-zinc-500">-</span>
                  <Input type="number" min={0} placeholder="0" defaultValue={m.away_score ?? ""} onChange={(e) => setScore(m.id, "away", e.target.value)} className="w-14 bg-white/5 border-white/15 h-9 text-center" data-testid={`score-away-${m.id}`} />
                  <span className="text-[10px] text-zinc-500 ml-1">Korner</span>
                  <Input type="number" min={0} placeholder="K" defaultValue={m.home_corners ?? ""} onChange={(e) => setScore(m.id, "home_c", e.target.value)} className="w-12 bg-cyan-500/10 border-cyan-500/30 h-9 text-center" data-testid={`corner-home-${m.id}`} title="Ev sahibi korner" />
                  <span className="text-zinc-500">-</span>
                  <Input type="number" min={0} placeholder="K" defaultValue={m.away_corners ?? ""} onChange={(e) => setScore(m.id, "away_c", e.target.value)} className="w-12 bg-cyan-500/10 border-cyan-500/30 h-9 text-center" data-testid={`corner-away-${m.id}`} title="Deplasman korner" />
                  {m.status !== "finished" && m.status !== "live" && (
                    <button onClick={() => start(m)} data-testid={`start-match-${m.id}`} className="btn-primary rounded-full px-3 py-1.5 text-sm flex items-center gap-1"><Flag className="w-3.5 h-3.5" /> Başlat</button>
                  )}
                  {m.status === "live" && (
                    <button onClick={() => finish(m)} data-testid={`finish-match-${m.id}`} className="rounded-full px-3 py-1.5 text-sm flex items-center gap-1 bg-neon-green/15 border border-neon-green/40 text-neon-green"><FlagOff className="w-3.5 h-3.5" /> Bitir</button>
                  )}
                  {m.status === "finished" && (
                    <button onClick={() => edit(m)} data-testid={`edit-match-${m.id}`} className="rounded-full px-3 py-1.5 text-sm flex items-center gap-1 bg-white/10 border border-white/20"><Pencil className="w-3.5 h-3.5" /> Güncelle</button>
                  )}
                  {m.status === "scheduled" && (
                    <button onClick={() => finish(m)} className="rounded-full px-3 py-1.5 text-sm bg-white/10 border border-white/20" data-testid={`quickfinish-match-${m.id}`}>Skor Gir</button>
                  )}
                  {m.status !== "finished" && (
                    <button onClick={() => setCancelTarget(m)} data-testid={`cancel-match-${m.id}`} title="Maçı iptal et" className="rounded-full p-1.5 bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors"><X className="w-4 h-4" /></button>
                  )}
                </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      ))}
      <CancelMatchDialog open={!!cancelTarget} match={cancelTarget} mode="league" onClose={() => setCancelTarget(null)} onDone={load} />
    </div>
  );
}

/* ---------------- Player Pool ---------------- */
function PlayersTab() {
  const confirm = useConfirm();
  const [players, setPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", surname: "", photo_url: "", value: "", club: "", club_logo_url: "" });
  const [clubForm, setClubForm] = useState({ name: "", logo_url: "" });

  const load = () => api.get("/players", { params: { q } }).then((r) => setPlayers(r.data));
  const loadClubs = () => api.get("/pool-clubs").then((r) => setClubs(r.data)).catch(() => {});
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { loadClubs(); }, []);

  const add = async () => {
    if (!form.name.trim()) return toast.error("Oyuncu adı gerekli");
    try {
      await api.post("/admin/players", { ...form, value: parseFloat(form.value) || 0 });
      toast.success("Oyuncu havuza eklendi");
      setForm({ name: "", surname: "", photo_url: "", value: "", club: "", club_logo_url: "" });
      load();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`/admin/players/${id}`); load(); };

  const addClub = async () => {
    if (!clubForm.name.trim()) return toast.error("Takım adı gerekli");
    try {
      await api.post("/admin/pool-clubs", { name: clubForm.name.trim(), logo_url: clubForm.logo_url });
      toast.success("Takım listeye eklendi");
      setClubForm({ name: "", logo_url: "" });
      loadClubs();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  const delClub = async (c) => {
    const ok = await confirm({ title: `${c.name} listeden silinsin mi?`, description: "Takım, oyuncu ekleme listesinden kaldırılacak.", confirmText: "Sil" });
    if (!ok) return;
    await api.delete(`/admin/pool-clubs/${c.id}`); loadClubs();
  };

  const pickClub = (id) => {
    const c = clubs.find((x) => x.id === id);
    setForm((f) => ({ ...f, club: c ? c.name : "", club_logo_url: c ? c.logo_url : "" }));
  };
  const selectedClubId = clubs.find((c) => c.name === form.club)?.id || "";

  return (
    <div className="space-y-6">
      <Section title="Takım Ekle (Oyuncu Listesi)">
        <p className="text-sm text-zinc-400 mb-3">Buraya eklediğiniz takımlar, oyuncu eklerken aşağıdaki "Takımı" listesinde otomatik görünür.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]"><span className="label-xs">Takım Adı</span><Input value={clubForm.name} onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })} data-testid="club-name-input" className="mt-1 bg-white/5 border-white/15" placeholder="Örn. Galatasaray" /></div>
          <ImageUpload value={clubForm.logo_url} onChange={(u) => setClubForm({ ...clubForm, logo_url: u })} label="Takım Logosu" round testid="club-logo" />
          <button onClick={addClub} data-testid="add-club-btn" className="btn-primary rounded-full px-5 py-2.5 flex items-center gap-2"><Plus className="w-4 h-4" /> Takım Ekle</button>
        </div>
        {clubs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4" data-testid="club-list">
            {clubs.map((c) => (
              <span key={c.id} data-testid={`club-chip-${c.id}`} className="flex items-center gap-2 glass rounded-full pl-2 pr-1 py-1 text-sm">
                {c.logo_url ? <img src={c.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" /> : <span className="w-5 h-5 rounded-full bg-white/10" />}
                {c.name}
                <button onClick={() => delClub(c)} className="text-red-400 hover:text-red-300 p-0.5"><X className="w-3.5 h-3.5" /></button>
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Havuza Oyuncu Ekle">
        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
          <div><span className="label-xs">Ad</span><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="pool-name-input" className="mt-1 bg-white/5 border-white/15" /></div>
          <div><span className="label-xs">Soyad</span><Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} data-testid="pool-surname-input" className="mt-1 bg-white/5 border-white/15" /></div>
          <div><span className="label-xs">Aktif Değer (M€)</span><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} data-testid="pool-value-input" className="mt-1 bg-white/5 border-white/15" /></div>
          <div>
            <span className="label-xs">Takımı</span>
            <select value={selectedClubId} onChange={(e) => pickClub(e.target.value)} data-testid="pool-club-select" className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-2 py-2 text-sm">
              <option value="">Takım seç {clubs.length === 0 ? "(önce takım ekleyin)" : ""}</option>
              {clubs.map((c) => <option key={c.id} value={c.id} className="bg-ink-800">{c.name}</option>)}
            </select>
          </div>
          <ImageUpload value={form.photo_url} onChange={(u) => setForm({ ...form, photo_url: u })} label="Oyuncu Fotoğrafı" round testid="pool-photo" />
        </div>
        <button onClick={add} data-testid="add-pool-player-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2 mt-4"><Plus className="w-4 h-4" /> Havuza Ekle</button>
      </Section>

      <Section title={`Oyuncu Havuzu (${players.length})`}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: oyuncu / kulüp" data-testid="pool-search" className="bg-white/5 border-white/15 mb-3 max-w-xs" />
        <div className="space-y-2">
          {players.map((p) => (
            <div key={p.id} data-testid={`pool-row-${p.id}`} className="flex items-center justify-between glass rounded-xl px-4 py-2">
              <div className="flex items-center gap-3">
                <img src={p.photo_url || "/player-default.png"} alt="" className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <div className="font-semibold text-sm">{p.name} {p.surname}</div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-1">{p.club_logo_url && <img src={p.club_logo_url} alt="" className="w-3.5 h-3.5 rounded-full" />}{p.club}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm neon-text-green font-bold">€{p.value}M</span>
                <button onClick={() => del(p.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {players.length === 0 && <div className="text-zinc-500 text-sm">Havuzda oyuncu yok.</div>}
        </div>
      </Section>
    </div>
  );
}

/* ---------------- Exhibition (Gösteri Maçı) ---------------- */
function ExhibitionTab() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/exhibition-matches").then((r) => setMatches(r.data)).catch(() => {});
  useEffect(() => { api.get("/teams").then((r) => setTeams(r.data)).catch(() => {}); load(); }, []);

  const create = async () => {
    if (!home || !away || home === away) return toast.error("Farklı iki takım seçin");
    setBusy(true);
    try {
      await api.post("/admin/exhibition", { home_team_id: home, away_team_id: away, scheduled_time: time });
      toast.success("Gösteri maçı oluşturuldu, bildirim gönderildi");
      setHome(""); setAway(""); setTime(""); load();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setBusy(false); }
  };

  const del = async (m) => {
    const ok = await confirm({ title: "Gösteri maçı silinsin mi?", description: "Maç ve atanan admin yetkisi kaldırılacak.", confirmText: "Sil" });
    if (!ok) return;
    try { await api.delete(`/admin/exhibition/${m.id}`); toast.success("Silindi"); load(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <Section title="Yeni Gösteri Maçı">
        <p className="text-sm text-zinc-400 mb-3">Gösteri maçları puan durumunu veya tur atlamayı etkilemez. Oluşturunca tüm kullanıcılara bildirim gider; canlı maç fonksiyonları (gol, devre, bitiş) normal çalışır.</p>
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div><span className="label-xs">Ev Sahibi</span><select value={home} onChange={(e) => setHome(e.target.value)} data-testid="exh-home-select" className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-2 py-2 text-sm"><option value="">Seç</option>{teams.map((t) => <option key={t.id} value={t.id} className="bg-ink-800">{t.name}</option>)}</select></div>
          <div><span className="label-xs">Deplasman</span><select value={away} onChange={(e) => setAway(e.target.value)} data-testid="exh-away-select" className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-2 py-2 text-sm"><option value="">Seç</option>{teams.map((t) => <option key={t.id} value={t.id} className="bg-ink-800">{t.name}</option>)}</select></div>
          <div><span className="label-xs">Saat (ops.)</span><Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="20:00" className="mt-1 bg-white/5 border-white/15" /></div>
          <button onClick={create} disabled={busy} data-testid="create-exhibition-btn" className="btn-primary rounded-full px-4 py-2.5 flex items-center justify-center gap-1">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Oluştur</button>
        </div>
      </Section>

      <Section title={`Gösteri Maçları (${matches.length})`}>
        <div className="space-y-2">
          {matches.length === 0 && <div className="text-zinc-500 text-sm">Henüz gösteri maçı yok.</div>}
          {matches.map((m) => (
            <div key={m.id} data-testid={`exhibition-row-${m.id}`} className="flex items-center justify-between gap-3 flex-wrap glass rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="font-heading font-bold">{m.home.abbreviation}</span>
                <span className="text-zinc-500">vs</span>
                <span className="font-heading font-bold">{m.away.abbreviation}</span>
                {m.status === "live" && <span className="text-[10px] neon-text-green animate-pulse-glow ml-2">CANLI</span>}
                {m.status === "finished" && <span className="text-sm ml-2">{m.home_score}-{m.away_score}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/match/${m.id}`)} data-testid={`exh-manage-${m.id}`} className="btn-primary rounded-full px-4 py-1.5 text-sm flex items-center gap-1"><PlayCircle className="w-3.5 h-3.5" /> Yönet</button>
                <button onClick={() => del(m)} className="rounded-full p-1.5 bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ---------------- Magazine ---------------- */
function MagazineTab() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [img, setImg] = useState("");
  const [videoFile, setVideoFile] = useState("");
  const [youtube, setYoutube] = useState("");
  const [highlight, setHighlight] = useState(false);
  const [targets, setTargets] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const load = () => api.get("/magazine").then((r) => setItems(r.data));
  useEffect(() => { load(); api.get("/mention-targets").then((r) => setTargets(r.data)).catch(() => {}); }, []);

  const onBodyChange = (e) => {
    const val = e.target.value;
    setBody(val);
    const pos = e.target.selectionStart || val.length;
    const before = val.slice(0, pos);
    const m = before.match(/@([^\s@]*)$/);
    if (m) { setMentionQuery(m[1]); setShowMentions(true); }
    else setShowMentions(false);
  };

  const pickMention = (t) => {
    setBody((b) => b.replace(/@([^\s@]*)$/, `@${t.label} `));
    setMentions((arr) => (arr.some((x) => x.url === t.url && x.label === t.label && x.type === t.type) ? arr : [...arr, { ...t, tag: "" }]));
    setShowMentions(false);
  };
  const setMentionTag = (i, v) => setMentions((arr) => arr.map((m, j) => (j === i ? { ...m, tag: v } : m)));
  const removeMention = (i) => setMentions((arr) => arr.filter((_, j) => j !== i));

  const filtered = (targets || []).filter((t) => t.label.toLowerCase().includes((mentionQuery || "").toLowerCase())).slice(0, 8);

  const reset = () => { setTitle(""); setBody(""); setImg(""); setVideoFile(""); setYoutube(""); setHighlight(false); setMentions([]); };
  const add = async () => {
    if (!title.trim()) return toast.error("Başlık gerekli");
    const video_url = youtube.trim() || videoFile;
    const payload = {
      title, body, image_url: img, video_url, is_leader_highlight: highlight,
      mentions: mentions.map((mm) => ({ type: mm.type, label: mm.label, url: mm.url, ref_id: mm.ref_id || "", tag: (mm.tag || "").trim() || mm.default_tag })),
    };
    try { await api.post("/admin/magazine", payload); toast.success("Haber eklendi"); reset(); load(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`/admin/magazine/${id}`); load(); };

  return (
    <div className="space-y-6">
      <Section title="Yeni Haber / Dedikodu / Video">
        <div className="space-y-3 max-w-xl">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık" data-testid="magazine-title-input" className="bg-white/5 border-white/15" />
          <div className="relative">
            <Textarea value={body} onChange={onBodyChange} placeholder="Analiz / dedikodu... (@ ile kullanıcı veya sayfa etiketleyin)" data-testid="magazine-body-input" className="bg-white/5 border-white/15" rows={3} />
            {showMentions && filtered.length > 0 && (
              <div className="absolute z-50 mt-1 w-full glass-strong rounded-xl overflow-hidden max-h-56 overflow-y-auto thin-scroll border border-white/10" data-testid="mention-dropdown">
                {filtered.map((t, i) => (
                  <button key={i} type="button" onClick={() => pickMention(t)} data-testid={`mention-option-${i}`} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-left text-sm">
                    {t.type === "user" ? <AtSign className="w-4 h-4 text-neon-blue shrink-0" /> : <span className="w-4 h-4 shrink-0 flex items-center justify-center text-neon-blue font-bold">#</span>}
                    <span className="flex-1 truncate">{t.label}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">{t.type === "user" ? "kullanıcı" : t.type === "team" ? "takım" : "sayfa"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {mentions.length > 0 && (
            <div className="space-y-2" data-testid="mention-list">
              <span className="label-xs">Bağlantılar (etiket boşsa varsayılan görünür)</span>
              {mentions.map((mm, i) => (
                <div key={i} className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                  <AtSign className="w-4 h-4 text-neon-blue shrink-0" />
                  <span className="text-sm font-medium min-w-0 truncate flex-1">{mm.label}</span>
                  <Input value={mm.tag} onChange={(e) => setMentionTag(i, e.target.value)} placeholder={mm.default_tag} data-testid={`mention-tag-${i}`} className="h-8 bg-white/5 border-white/15 max-w-[160px]" />
                  <button onClick={() => removeMention(i)} className="text-red-400"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          <ImageUpload value={img} onChange={setImg} label="Görsel (opsiyonel)" testid="magazine-image" />
          <div className="rounded-2xl border border-white/10 p-3 space-y-3">
            <span className="label-xs text-neon-blue">Video (opsiyonel) · röportaj vb.</span>
            <VideoUpload value={videoFile} onChange={setVideoFile} label="Cihazdan Video Yükle" testid="magazine-video-upload" />
            <div>
              <span className="label-xs">veya YouTube Linki</span>
              <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtu.be/..." data-testid="magazine-youtube-input" className="mt-1 bg-white/5 border-white/15" />
            </div>
            {(videoFile && youtube) && <p className="text-[11px] text-yellow-400">İki video girdiniz; YouTube linki önceliklidir.</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} /> Lider takım vurgusu</label>
          <button onClick={add} data-testid="add-magazine-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2"><Plus className="w-4 h-4" /> Yayınla</button>
        </div>
      </Section>
      <Section title="Yayınlananlar">
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between glass rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 min-w-0"><div className="min-w-0"><div className="font-semibold flex items-center gap-1.5">{it.video_url && <PlayCircle className="w-3.5 h-3.5 text-neon-blue shrink-0" />}{it.title}{it.mentions && it.mentions.length > 0 && <AtSign className="w-3.5 h-3.5 text-neon-blue shrink-0" />}</div><div className="text-xs text-zinc-500 line-clamp-1">{it.body}</div></div></div>
              <button onClick={() => del(it.id)} className="text-red-400 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {items.length === 0 && <div className="text-zinc-500 text-sm">Henüz haber yok.</div>}
        </div>
      </Section>
    </div>
  );
}

/* ---------------- Users ---------------- */
function UsersTab() {
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [edit, setEdit] = useState({});
  const [editTeam, setEditTeam] = useState(null);

  const load = () => {
    api.get("/admin/users").then((r) => setUsers(r.data));
    api.get("/teams").then((r) => setTeams(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const teamFor = (u) => teams.find((t) => t.id === u.team_id || t.name === u.team_name);

  const save = async (u) => {
    const e = edit[u.id] || {};
    try { await api.put(`/admin/users/${u.id}`, { username: e.username || undefined, password: e.password || undefined }); toast.success("Güncellendi"); setEdit((s) => ({ ...s, [u.id]: {} })); load(); }
    catch (er) { toast.error(formatError(er.response?.data?.detail)); }
  };
  const del = async (u) => { const ok = await confirm({ title: `${u.username} silinsin mi?`, description: "Kullanıcı ve takımı kalıcı olarak silinecek." }); if (!ok) return; try { await api.delete(`/admin/users/${u.id}`); load(); } catch (e) { toast.error(formatError(e.response?.data?.detail)); } };

  return (
    <Section title="Kullanıcı Yönetimi">
      <div className="space-y-2">
        {users.map((u) => {
          const t = teamFor(u);
          return (
          <div key={u.id} data-testid={`user-row-${u.id}`} className="flex items-center gap-2 flex-wrap glass rounded-xl px-4 py-3">
            <div className="min-w-[140px]">
              <div className="font-semibold flex items-center gap-2">{u.username} {u.role === "admin" && <span className="text-[10px] neon-text-blue">ADMIN</span>}{u.role === "founder" && <span className="text-[10px] text-yellow-300">KURUCU</span>}</div>
              <div className="text-xs text-zinc-500">{u.team_name || "Takım yok"}</div>
            </div>
            <Input placeholder="Yeni kullanıcı adı" onChange={(e) => setEdit((s) => ({ ...s, [u.id]: { ...s[u.id], username: e.target.value } }))} className="bg-white/5 border-white/15 h-9 flex-1 min-w-[120px]" />
            <Input placeholder="Yeni şifre" onChange={(e) => setEdit((s) => ({ ...s, [u.id]: { ...s[u.id], password: e.target.value } }))} className="bg-white/5 border-white/15 h-9 flex-1 min-w-[120px]" />
            <button onClick={() => save(u)} data-testid={`save-user-${u.id}`} className="btn-primary rounded-full px-3 py-1.5 text-sm">Kaydet</button>
            {t && <button onClick={() => setEditTeam(t)} data-testid={`edit-team-${u.id}`} className="rounded-full px-3 py-1.5 text-sm glass border border-white/15">Takımı Düzenle</button>}
            {u.role !== "admin" && u.role !== "founder" && <button onClick={() => del(u)} className="text-red-400 px-2"><Trash2 className="w-4 h-4" /></button>}
          </div>
          );
        })}
      </div>
      <FounderTeamEditDialog team={editTeam} onClose={() => setEditTeam(null)} onSaved={load} />
    </Section>
  );
}

function FounderTeamEditDialog({ team, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [logo, setLogo] = useState("");
  const [desc, setDesc] = useState("");
  const [m, setM] = useState({});
  const [country, setCountry] = useState(null);
  const [players, setPlayers] = useState([]);
  const [formation, setFormation] = useState("");
  const [playerEdit, setPlayerEdit] = useState(null); // {index|null}
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name || ""); setAbbr(team.abbreviation || ""); setLogo(team.logo_url || "");
      setDesc(team.description || ""); setM(team.manager || {});
      setCountry(team.manager?.nationality ? { name: team.manager.nationality } : null);
      setPlayers(team.players || []);
      setFormation(team.formation || "");
    }
  }, [team]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/teams/${team.id}`, {
        name, abbreviation: abbr, logo_url: logo, description: desc,
        manager: { ...m, nationality: country?.name || m.nationality || "", flag: country?.code ? flagEmoji(country.code) : m.flag || "" },
        players, formation,
      });
      toast.success("Takım güncellendi");
      onSaved && onSaved();
      onClose();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setSaving(false); }
  };

  const savePlayer = (data) => {
    setPlayers((arr) => {
      if (playerEdit && playerEdit.index != null) {
        return arr.map((p, i) => (i === playerEdit.index ? { ...p, ...data } : p));
      }
      return [...arr, { id: `p_${Date.now()}`, slot: "", bench: false, ...data }];
    });
    setPlayerEdit(null);
  };
  const removePlayer = () => {
    if (playerEdit && playerEdit.index != null) setPlayers((arr) => arr.filter((_, i) => i !== playerEdit.index));
    setPlayerEdit(null);
  };

  return (
    <Dialog open={!!team} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-white sm:max-w-lg max-h-[88vh] overflow-y-auto thin-scroll" data-testid="founder-team-edit-dialog">
        <DialogHeader><DialogTitle className="font-heading">Takımı Düzenle</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <ImageUpload value={logo} onChange={setLogo} label="Logo" round testid="ft-logo" />
            <ImageUpload value={m.photo_url} onChange={(u) => setM({ ...m, photo_url: u })} label="TD Foto" round testid="ft-mgr-photo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="label-xs">Takım Adı</span><Input value={name} onChange={(e) => setName(e.target.value)} data-testid="ft-team-name" className="mt-1 bg-white/5 border-white/15" /></div>
            <div><span className="label-xs">Kısaltma</span><Input value={abbr} maxLength={3} onChange={(e) => setAbbr(e.target.value.toUpperCase().slice(0, 3))} className="mt-1 bg-white/5 border-white/15 uppercase" /></div>
            <div><span className="label-xs">TD İsim</span><Input value={m.name || ""} onChange={(e) => setM({ ...m, name: e.target.value })} className="mt-1 bg-white/5 border-white/15" /></div>
            <div><span className="label-xs">Ülke</span><div className="mt-1"><CountrySelect value={country?.name} onChange={setCountry} testid="ft-country" /></div></div>
          </div>
          <div><span className="label-xs">Açıklama</span><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 bg-white/5 border-white/15" rows={2} /></div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="label-xs">Kadro / Oyuncular ({players.length})</span>
              <button onClick={() => setPlayerEdit({ index: null })} data-testid="ft-add-player" className="rounded-full px-3 py-1 text-xs btn-primary flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Oyuncu Ekle</button>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto thin-scroll">
              {players.length === 0 && <div className="text-xs text-zinc-500">Kadroda oyuncu yok.</div>}
              {players.map((p, i) => (
                <div key={p.id || i} data-testid={`ft-player-${i}`} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
                  <img src={p.photo_url || "/player-default.png"} alt="" className="w-7 h-7 rounded-full object-cover" />
                  <span className="text-sm flex-1 truncate">{p.name}{p.slot ? <span className="text-[10px] text-zinc-500 ml-1">{p.slot}</span> : null}</span>
                  <span className="text-xs neon-text-green font-bold">€{p.value}M</span>
                  <button onClick={() => setPlayerEdit({ index: i })} data-testid={`ft-edit-player-${i}`} className="text-zinc-300 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving} data-testid="ft-save-btn" className="btn-primary w-full rounded-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
          </button>
        </div>
      </DialogContent>
      <PlayerModal
        open={!!playerEdit}
        onClose={() => setPlayerEdit(null)}
        slot={playerEdit && playerEdit.index != null ? { label: players[playerEdit.index]?.slot } : null}
        player={playerEdit && playerEdit.index != null ? players[playerEdit.index] : null}
        onSave={savePlayer}
        onRemove={removePlayer}
      />
    </Dialog>
  );
}

/* ---------------- Day Summary ---------------- */
function SummaryTab() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    setBusy(true);
    try { const r = await api.get(`/day-summary`, { params: { date } }); setData(r.data); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setBusy(false); }
  };

  const download = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { backgroundColor: "#08080A", scale: 2 });
    const link = document.createElement("a");
    link.download = `gunun-ozeti-${date}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="space-y-6">
      <Section title="Günün Özeti">
        <div className="flex items-end gap-3 flex-wrap">
          <div><span className="label-xs">Tarih</span><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="summary-date-input" className="mt-1 bg-white/5 border-white/15" /></div>
          <button onClick={load} disabled={busy} data-testid="load-summary-btn" className="btn-primary rounded-full px-6 py-2.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Getir"}</button>
          {data && <button onClick={download} data-testid="download-summary-btn" className="rounded-full px-6 py-2.5 bg-neon-green/15 border border-neon-green/40 text-neon-green flex items-center gap-2"><Download className="w-4 h-4" /> PNG İndir</button>}
        </div>
      </Section>

      {data && (
        <div ref={ref} className="rounded-3xl p-8 bg-ink-900 border border-white/10" data-testid="summary-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-heading font-extrabold text-3xl">{data.tournament || "Turnuva"}</div>
              <div className="neon-text-blue text-sm">Günün Özeti · {new Date(data.date).toLocaleDateString("tr-TR")}</div>
            </div>
            <img src="/icon-192.png" alt="" className="w-14 h-14" />
          </div>
          <h4 className="font-heading text-lg mb-3">Bugünün Sonuçları</h4>
          {data.matches.length === 0 ? (
            <div className="text-zinc-500 text-sm mb-6">Bu tarihte oynanan maç yok.</div>
          ) : (
            <div className="space-y-2 mb-6">
              {data.matches.map((m) => (
                <div key={m.id} className="flex items-center justify-between glass rounded-xl px-4 py-2">
                  <span className="font-bold">{m.home.abbreviation}</span>
                  <span className="font-heading font-extrabold neon-text-green">{m.home_score} - {m.away_score}</span>
                  <span className="font-bold">{m.away.abbreviation}</span>
                </div>
              ))}
            </div>
          )}
          <h4 className="font-heading text-lg mb-3">Güncel Puan Durumu</h4>
          <StandingsTable rows={data.standings} />
        </div>
      )}
    </div>
  );
}


/* ---------------- Roles (Kurucu) ---------------- */
function teamLabel(t) { return t ? (t.name || t.abbreviation || "?") : "?"; }

function useAssignableMatches(tournament) {
  const [matches, setMatches] = useState([]);
  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        let list = [];
        if (!tournament) {
          list = [];
        } else if (tournament.mode === "cup") {
          const { data } = await api.get("/cup/bracket");
          (data.rounds || []).forEach((r) => r.matches.forEach((m) => {
            if (!m.bye && m.home && m.away && m.status !== "finished") list.push({ id: m.id, label: `${r.label}: ${teamLabel(m.home)} - ${teamLabel(m.away)}` });
          }));
        } else {
          const { data } = await api.get("/matches");
          list = (data || []).filter((m) => m.status !== "finished").map((m) => ({ id: m.id, label: `H${m.week}: ${teamLabel(m.home)} - ${teamLabel(m.away)}` }));
        }
        try {
          const ex = await api.get("/exhibition-matches");
          (ex.data || []).filter((m) => m.status !== "finished").forEach((m) => list.push({ id: m.id, label: `Gösteri: ${teamLabel(m.home)} - ${teamLabel(m.away)}` }));
        } catch { /* ignore */ }
        if (!cancel) setMatches(list);
      } catch { if (!cancel) setMatches([]); }
    }
    load();
    return () => { cancel = true; };
  }, [tournament]);
  return matches;
}

function RolesTab({ tournament }) {
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState({}); // userId -> matchId
  const matches = useAssignableMatches(tournament);
  const load = () => api.get("/admin/users").then((r) => setUsers(r.data.filter((u) => u.role !== "founder")));
  useEffect(() => { load(); }, []);

  const grant = async (u) => {
    const matchId = sel[u.id] || "";
    try {
      await api.post(`/founder/users/${u.id}/grant-admin`, { match_id: matchId || null });
      toast.success(`${u.username} artık admin`);
      load();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  const revoke = async (u) => {
    const ok = await confirm({ title: `${u.username} yetkisi alınsın mı?`, description: "Admin rolü kaldırılacak, atanan maç sıfırlanacak.", confirmText: "Yetkiyi Al" });
    if (!ok) return;
    try { await api.post(`/founder/users/${u.id}/revoke-admin`); toast.success("Yetki alındı"); load(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const matchName = (id) => matches.find((m) => m.id === id)?.label || (id ? "Atanmış maç" : "Maç atanmadı");

  return (
    <Section title="Admin Rolleri & Maç Atamaları">
      <p className="text-sm text-zinc-400 mb-4">Bir kullanıcıyı admin yap, bir maça ata. Admin yalnızca o maçta gol bildirimi ve devre başlat/bitir yapabilir.</p>
      <div className="space-y-2" data-testid="roles-list">
        {users.length === 0 && <div className="text-zinc-500 text-sm">Kullanıcı yok.</div>}
        {users.map((u) => (
          <div key={u.id} className="glass rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`role-row-${u.id}`}>
            <div className="flex-1 min-w-0">
              <div className="font-semibold flex items-center gap-2">
                {u.username}
                {u.role === "admin" && <span className="px-2 py-0.5 rounded-full bg-neon-blue/15 border border-neon-blue/30 text-[10px] font-bold neon-text-blue">ADMIN</span>}
              </div>
              {u.role === "admin" && <div className="text-[11px] text-zinc-400 mt-0.5">Maç: {matchName(u.assigned_match_id)}</div>}
            </div>
            {u.role === "admin" ? (
              <button onClick={() => revoke(u)} data-testid={`revoke-admin-${u.id}`} className="rounded-full px-4 py-2 bg-red-500/15 border border-red-500/40 text-red-200 text-sm hover:bg-red-500/25 transition-colors">Yetkiyi Al</button>
            ) : (
              <div className="flex items-center gap-2">
                <select value={sel[u.id] || ""} onChange={(e) => setSel((s) => ({ ...s, [u.id]: e.target.value }))} data-testid={`assign-match-${u.id}`} className="bg-ink-900 border border-white/15 rounded-lg px-2 py-2 text-sm max-w-[200px]">
                  <option value="">Maç seç (opsiyonel)</option>
                  {matches.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <button onClick={() => grant(u)} data-testid={`grant-admin-${u.id}`} className="btn-primary rounded-full px-4 py-2 text-sm whitespace-nowrap">Admin Yap</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- Branding (Kurucu) ---------------- */
function BrandingTab() {
  const { loadBranding } = useAuth();
  const [appName, setAppName] = useState("");
  const [logo, setLogo] = useState("");
  const [favicon, setFavicon] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/branding").then((r) => { setAppName(r.data.app_name || ""); setLogo(r.data.logo_url || ""); setFavicon(r.data.favicon_url || ""); });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/founder/branding", { app_name: appName, logo_url: logo, favicon_url: favicon });
      await loadBranding();
      toast.success("Marka ayarları kaydedildi");
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setSaving(false); }
  };

  return (
    <Section title="Marka & Görünüm">
      <div className="space-y-5 max-w-lg">
        <div>
          <span className="label-xs">Uygulama Adı (sol üst yazı)</span>
          <Input value={appName} onChange={(e) => setAppName(e.target.value)} data-testid="branding-app-name" className="mt-1 bg-white/5 border-white/15" placeholder="eFootball Lig" />
        </div>
        <div className="flex gap-6">
          <ImageUpload value={logo} onChange={setLogo} label="Logo / Uygulama İkonu" round testid="branding-logo" />
          <ImageUpload value={favicon} onChange={setFavicon} label="Favicon" round testid="branding-favicon" />
        </div>
        <button onClick={save} disabled={saving} data-testid="branding-save-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
        </button>
      </div>
    </Section>
  );
}

/* ---------------- Admin match panel (assigned admin) ---------------- */
function AdminMatchPanel({ user, tournament }) {
  const navigate = useNavigate();
  const matches = useAssignableMatches(tournament);
  const assigned = matches.find((m) => m.id === user?.assigned_match_id);
  return (
    <Section>
      {!user?.assigned_match_id ? (
        <div className="text-center py-10 text-zinc-400" data-testid="admin-no-match">
          <Shield className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          Henüz bir maça atanmadınız. Kurucu sizi bir maça atadığında burada görünecek.
        </div>
      ) : (
        <div data-testid="admin-assigned-match">
          <h3 className="font-heading text-lg mb-2">Atanan Maçınız</h3>
          <div className="glass rounded-2xl p-4 text-zinc-200 mb-4">{assigned?.label || "Maç bilgisi yükleniyor…"}</div>
          <button onClick={() => navigate(`/match/${user.assigned_match_id}`)} data-testid="admin-manage-match-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2">
            <PlayCircle className="w-4 h-4" /> Maçı Yönet (Canlı Takip)
          </button>
          <p className="text-sm text-zinc-500 mt-4">Bu maçta gol bildirimi, gol düzeltme ve 1./2. yarı başlat-bitir işlemlerini yapabilirsiniz.</p>
        </div>
      )}
    </Section>
  );
}
