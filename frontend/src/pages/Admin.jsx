import React, { useEffect, useState, useRef } from "react";
import { Layout } from "../components/Layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { ImageUpload } from "../components/ImageUpload";
import { StandingsTable } from "../components/StandingsTable";
import { useConfirm } from "../components/ConfirmProvider";
import api, { formatError } from "../lib/api";
import html2canvas from "html2canvas";
import {
  Trophy, PlayCircle, PauseCircle, Trash2, Shuffle, Plus, Save, Download,
  Flag, FlagOff, Pencil, X, Loader2, ShieldHalf,
} from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [tournament, setTournament] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    api.get("/tournament/active").then((r) => setTournament(r.data));
  }, [refreshKey]);

  const isCup = tournament?.mode === "cup";

  return (
    <Layout>
      <h1 className="font-heading font-extrabold text-2xl sm:text-3xl mb-6 flex items-center gap-2">
        <Trophy className="w-7 h-7 text-yellow-400" /> Admin Paneli
      </h1>
      <Tabs defaultValue="tournament">
        <TabsList className="glass rounded-full p-1 flex-wrap h-auto gap-1 mb-6">
          {(isCup
            ? [["tournament", "Turnuva"], ["cup", "Kupa"], ["players", "Oyuncu Havuzu"], ["magazine", "Magazin"], ["users", "Kullanıcılar"]]
            : [["tournament", "Turnuva"], ["fixture", "Fikstür"], ["matches", "Maçlar"], ["players", "Oyuncu Havuzu"], ["magazine", "Magazin"], ["users", "Kullanıcılar"], ["summary", "Günün Özeti"]]
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
        <TabsContent value="magazine"><MagazineTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
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
  const [mode, setMode] = useState("league");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!name.trim()) return toast.error(mode === "cup" ? "Kupa adı gerekli" : "Turnuva adı gerekli");
    setBusy(true);
    try {
      await api.post("/admin/tournament", { name, weeks: parseInt(weeks) || 1, cover_url: cover, mode });
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
          <button onClick={del} data-testid="delete-tournament-btn" className="rounded-full px-5 py-2.5 flex items-center gap-2 bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors"><Trash2 className="w-4 h-4" /> Tamamen Sil</button>
        </div>
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
        <ImageUpload value={cover} onChange={setCover} label="Kapak Görseli" testid="tournament-cover" />
        <button onClick={start} disabled={busy} data-testid="start-tournament-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} {mode === "cup" ? "Kupayı Başlat" : "Turnuvayı Başlat"}</button>
      </div>
    </Section>
  );
}

/* ---------------- Cup Management ---------------- */
function CupTab({ tournament, onChange }) {
  const confirm = useConfirm();
  const [bracket, setBracket] = useState(null);
  const [inputs, setInputs] = useState({}); // { matchId: {home, away, pen} }
  const [busy, setBusy] = useState(false);

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
                      </div>
                      {!m.bye && editable && m.status === "scheduled" && (
                        <button onClick={() => start(m)} data-testid={`cup-start-${m.id}`} className="btn-primary rounded-full px-4 py-1.5 text-sm flex items-center gap-1"><Flag className="w-3.5 h-3.5" /> Başlat</button>
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

  const load = () => api.get("/matches").then((r) => setMatches(r.data));
  useEffect(() => { load(); }, []);

  const setScore = (id, k, v) => setScores((s) => ({ ...s, [id]: { ...s[id], [k]: v } }));

  const start = async (m) => {
    try { await api.post(`/admin/matches/${m.id}/start`); toast.success("Maç başlatıldı, bildirim gönderildi"); load(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  const finish = async (m) => {
    const s = scores[m.id] || {};
    const hs = parseInt(s.home ?? m.home_score ?? 0); const as_ = parseInt(s.away ?? m.away_score ?? 0);
    try { await api.post(`/admin/matches/${m.id}/finish`, { home_score: hs, away_score: as_ }); toast.success("Maç bitti, bildirim gönderildi"); load(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  const edit = async (m) => {
    const s = scores[m.id] || {};
    try {
      await api.put(`/admin/matches/${m.id}`, {
        home_score: s.home != null ? parseInt(s.home) : m.home_score,
        away_score: s.away != null ? parseInt(s.away) : m.away_score,
      });
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
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="number" min={0} placeholder="0" defaultValue={m.home_score ?? ""} onChange={(e) => setScore(m.id, "home", e.target.value)} className="w-14 bg-white/5 border-white/15 h-9 text-center" data-testid={`score-home-${m.id}`} />
                  <span className="text-zinc-500">-</span>
                  <Input type="number" min={0} placeholder="0" defaultValue={m.away_score ?? ""} onChange={(e) => setScore(m.id, "away", e.target.value)} className="w-14 bg-white/5 border-white/15 h-9 text-center" data-testid={`score-away-${m.id}`} />
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
                </div>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

/* ---------------- Player Pool ---------------- */
function PlayersTab() {
  const [players, setPlayers] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", surname: "", photo_url: "", value: "", club: "", club_logo_url: "" });

  const load = () => api.get("/players", { params: { q } }).then((r) => setPlayers(r.data));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);

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

  return (
    <div className="space-y-6">
      <Section title="Havuza Oyuncu Ekle">
        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
          <div><span className="label-xs">Ad</span><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="pool-name-input" className="mt-1 bg-white/5 border-white/15" /></div>
          <div><span className="label-xs">Soyad</span><Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} data-testid="pool-surname-input" className="mt-1 bg-white/5 border-white/15" /></div>
          <div><span className="label-xs">Aktif Değer (M€)</span><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} data-testid="pool-value-input" className="mt-1 bg-white/5 border-white/15" /></div>
          <div><span className="label-xs">Oynadığı Takım</span><Input value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} data-testid="pool-club-input" className="mt-1 bg-white/5 border-white/15" /></div>
          <ImageUpload value={form.photo_url} onChange={(u) => setForm({ ...form, photo_url: u })} label="Oyuncu Fotoğrafı" round testid="pool-photo" />
          <ImageUpload value={form.club_logo_url} onChange={(u) => setForm({ ...form, club_logo_url: u })} label="Takım Logosu" round testid="pool-club-logo" />
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

/* ---------------- Magazine ---------------- */
function MagazineTab() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [img, setImg] = useState("");
  const [highlight, setHighlight] = useState(false);

  const load = () => api.get("/magazine").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!title.trim()) return toast.error("Başlık gerekli");
    try { await api.post("/admin/magazine", { title, body, image_url: img, is_leader_highlight: highlight }); toast.success("Haber eklendi"); setTitle(""); setBody(""); setImg(""); setHighlight(false); load(); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`/admin/magazine/${id}`); load(); };

  return (
    <div className="space-y-6">
      <Section title="Yeni Haber / Dedikodu">
        <div className="space-y-3 max-w-xl">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık" data-testid="magazine-title-input" className="bg-white/5 border-white/15" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Analiz / dedikodu..." className="bg-white/5 border-white/15" rows={3} />
          <ImageUpload value={img} onChange={setImg} label="Görsel (opsiyonel)" testid="magazine-image" />
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} /> Lider takım vurgusu</label>
          <button onClick={add} data-testid="add-magazine-btn" className="btn-primary rounded-full px-6 py-2.5 flex items-center gap-2"><Plus className="w-4 h-4" /> Yayınla</button>
        </div>
      </Section>
      <Section title="Yayınlananlar">
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between glass rounded-xl px-4 py-3">
              <div><div className="font-semibold">{it.title}</div><div className="text-xs text-zinc-500 line-clamp-1">{it.body}</div></div>
              <button onClick={() => del(it.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
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
  const [edit, setEdit] = useState({});

  const load = () => api.get("/admin/users").then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const save = async (u) => {
    const e = edit[u.id] || {};
    try { await api.put(`/admin/users/${u.id}`, { username: e.username || undefined, password: e.password || undefined }); toast.success("Güncellendi"); setEdit((s) => ({ ...s, [u.id]: {} })); load(); }
    catch (er) { toast.error(formatError(er.response?.data?.detail)); }
  };
  const del = async (u) => { const ok = await confirm({ title: `${u.username} silinsin mi?`, description: "Kullanıcı ve takımı kalıcı olarak silinecek." }); if (!ok) return; try { await api.delete(`/admin/users/${u.id}`); load(); } catch (e) { toast.error(formatError(e.response?.data?.detail)); } };

  return (
    <Section title="Kullanıcı Yönetimi">
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} data-testid={`user-row-${u.id}`} className="flex items-center gap-2 flex-wrap glass rounded-xl px-4 py-3">
            <div className="min-w-[140px]">
              <div className="font-semibold flex items-center gap-2">{u.username} {u.role === "admin" && <span className="text-[10px] neon-text-blue">ADMIN</span>}</div>
              <div className="text-xs text-zinc-500">{u.team_name || "Takım yok"}</div>
            </div>
            <Input placeholder="Yeni kullanıcı adı" onChange={(e) => setEdit((s) => ({ ...s, [u.id]: { ...s[u.id], username: e.target.value } }))} className="bg-white/5 border-white/15 h-9 flex-1 min-w-[120px]" />
            <Input placeholder="Yeni şifre" onChange={(e) => setEdit((s) => ({ ...s, [u.id]: { ...s[u.id], password: e.target.value } }))} className="bg-white/5 border-white/15 h-9 flex-1 min-w-[120px]" />
            <button onClick={() => save(u)} data-testid={`save-user-${u.id}`} className="btn-primary rounded-full px-3 py-1.5 text-sm">Kaydet</button>
            {u.role !== "admin" && <button onClick={() => del(u)} className="text-red-400 px-2"><Trash2 className="w-4 h-4" /></button>}
          </div>
        ))}
      </div>
    </Section>
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
