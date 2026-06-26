import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useConfirm } from "../components/ConfirmProvider";
import { ImageUpload } from "../components/ImageUpload";
import { VideoUpload } from "../components/VideoUpload";
import { VideoPlayer } from "../components/VideoPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import api, { formatError } from "../lib/api";
import { ArrowLeft, Loader2, PlayCircle, FlagOff, Goal, Repeat, Timer, Newspaper, Plus } from "lucide-react";
import { toast } from "sonner";

const RATE = 45 / 300; // displayed minutes per real second
const teamName = (t) => (t ? t.name || t.abbreviation || "?" : "?");

function computeClock(d) {
  const now = Date.now();
  const st = d.live_state;
  if (st === "halftime") return { label: "DEVRE", sub: "ARASI", live: true };
  if (st === "finished") return { label: "MS", sub: "Maç Sonu", live: false };
  if (st === "first_half" && d.fh_start) {
    const el = (now - new Date(d.fh_start).getTime()) / 1000;
    const m = Math.floor(el * RATE);
    if (m < 45) return { label: `${Math.max(1, m)}'`, live: true };
    const extra = Math.min(d.fh_injury || 0, Math.max(1, Math.floor(el * RATE - 45) + 1));
    return { label: `45+${extra}'`, live: true, injury: true };
  }
  if (st === "second_half" && d.sh_start) {
    const el = (now - new Date(d.sh_start).getTime()) / 1000;
    const m = Math.floor(el * RATE);
    if (m < 45) return { label: `${45 + m}'`, live: true };
    const extra = Math.min(d.sh_injury || 0, Math.max(1, Math.floor(el * RATE - 45) + 1));
    return { label: `90+${extra}'`, live: true, injury: true };
  }
  return { label: "VS", sub: "", live: false };
}

function FormChips({ seq, testid }) {
  const map = { W: ["G", "bg-neon-green/20 text-neon-green border-neon-green/40"], D: ["B", "bg-yellow-400/15 text-yellow-300 border-yellow-400/30"], L: ["M", "bg-red-500/15 text-red-300 border-red-500/30"] };
  return (
    <div className="flex gap-1 justify-center" data-testid={testid}>
      {(seq && seq.length ? seq : []).map((r, i) => (
        <span key={i} className={`w-6 h-6 rounded-md border text-[11px] font-bold flex items-center justify-center ${map[r]?.[1] || "bg-white/5 text-zinc-400"}`}>{map[r]?.[0] || "-"}</span>
      ))}
      {(!seq || !seq.length) && <span className="text-xs text-zinc-500">Maç yok</span>}
    </div>
  );
}

function TeamBlock({ t, last5, testid }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 min-w-0" data-testid={testid}>
      <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center overflow-hidden">
        {t?.logo_url ? <img src={t.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="font-heading text-2xl">{(t?.abbreviation || "?")[0]}</span>}
      </div>
      <div className="font-heading text-base sm:text-lg text-center leading-tight">{teamName(t)}</div>
      {t?.manager?.name && <div className="text-[11px] text-zinc-400 flex items-center gap-1">{t.manager.flag} TD: {t.manager.name}</div>}
      <FormChips seq={last5} testid={testid + "-form"} />
    </div>
  );
}

function PickTeamDialog({ open, title, home, away, onPick, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose} data-testid="pick-team-overlay">
      <div className="glass-strong rounded-3xl p-5 w-full max-w-sm border border-white/10" onClick={(e) => e.stopPropagation()} data-testid="pick-team-dialog">
        <h3 className="font-heading text-lg mb-4 text-center">{title}</h3>
        <div className="space-y-3">
          {[home, away].filter(Boolean).map((t) => (
            <button key={t.id} onClick={() => onPick(t.id)} data-testid={`pick-team-${t.id}`} className="w-full glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/10 transition-colors">
              {t.logo_url ? <img src={t.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">{(t.abbreviation || "?")[0]}</div>}
              <span className="font-semibold">{teamName(t)}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-full py-2.5 bg-white/5 border border-white/15 text-zinc-300">Vazgeç</button>
      </div>
    </div>
  );
}

export default function MatchTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [d, setD] = useState(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [goalPick, setGoalPick] = useState(false);
  const [correctPick, setCorrectPick] = useState(false);
  const [penPick, setPenPick] = useState(false);
  const [news, setNews] = useState([]);
  const [newsOpen, setNewsOpen] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: "", body: "", image_url: "", video_file: "", youtube: "" });
  const [newsBusy, setNewsBusy] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/matches/${id}/detail`); setD(data); }
    catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  }, [id]);

  const loadNews = useCallback(async () => {
    try { const { data } = await api.get(`/matches/${id}/magazine`); setNews(data || []); }
    catch { /* ignore */ }
  }, [id]);

  useEffect(() => { load(); loadNews(); }, [load, loadNews]);
  useEffect(() => {
    pollRef.current = setInterval(load, 4000);
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => { clearInterval(pollRef.current); clearInterval(t); };
  }, [load]);

  const act = async (path, body) => {
    setBusy(true);
    try { await api.post(`/live/matches/${id}/${path}`, body || {}); await load(); }
    catch (e) {
      const msg = formatError(e.response?.data?.detail);
      if (e.response?.status === 400 && msg.includes("penaltı")) { setPenPick(true); }
      else toast.error(msg);
    } finally { setBusy(false); }
  };

  if (!d) return <Layout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neon-blue" /></div></Layout>;

  const clock = computeClock(d);
  const isLive = d.live_state === "first_half" || d.live_state === "second_half" || d.live_state === "halftime";
  const finished = d.status === "finished";
  const hs = finished ? d.home_score : d.live_home;
  const as_ = finished ? d.away_score : d.live_away;
  const showScore = isLive || finished;
  const can = d.can_manage;

  const endMatch = async () => {
    const ok = await confirm({ title: "Maç bitirilsin mi?", description: `Skor ${hs} - ${as_} olarak kaydedilecek.`, confirmText: "Maçı Bitir" });
    if (ok) act("end-match");
  };

  const started = d.live_state !== "scheduled";
  const submitNews = async () => {
    if (!newsForm.title.trim()) return toast.error("Başlık gerekli");
    setNewsBusy(true);
    try {
      await api.post(`/admin/matches/${id}/magazine`, {
        title: newsForm.title,
        body: newsForm.body,
        image_url: newsForm.image_url,
        video_url: newsForm.youtube.trim() || newsForm.video_file,
      });
      toast.success("Karşılaşma haberi gönderildi, bildirim yapıldı");
      setNewsForm({ title: "", body: "", image_url: "", video_file: "", youtube: "" });
      setNewsOpen(false);
      loadNews();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setNewsBusy(false); }
  };

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4" data-testid="match-back-btn">
        <ArrowLeft className="w-4 h-4" /> Geri
      </button>

      <div className="glass-strong rounded-3xl p-5 sm:p-7 mb-5" data-testid="match-tracking-card">
        <div className="flex items-center justify-center gap-2 mb-5">
          {isLive && d.live_state !== "halftime" ? (
            <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold animate-pulse" data-testid="live-badge">● CANLI</span>
          ) : finished ? (
            <span className="px-3 py-1 rounded-full bg-white/10 text-zinc-300 text-xs font-bold">MAÇ SONU</span>
          ) : d.live_state === "halftime" ? (
            <span className="px-3 py-1 rounded-full bg-yellow-400/15 text-yellow-300 text-xs font-bold">DEVRE ARASI</span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-white/10 text-zinc-300 text-xs font-bold">{d.mode === "cup" ? "KUPA" : `${d.week}. HAFTA`}</span>
          )}
        </div>

        <div className="flex items-start gap-2 sm:gap-4">
          <TeamBlock t={d.home} last5={d.home_last5} testid="match-home" />
          <div className="flex flex-col items-center justify-center px-1 min-w-[90px] pt-4">
            {showScore ? (
              <div className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight" data-testid="match-score">
                <span className={hs > as_ ? "neon-text-green" : ""}>{hs}</span>
                <span className="text-zinc-500 mx-1">-</span>
                <span className={as_ > hs ? "neon-text-green" : ""}>{as_}</span>
              </div>
            ) : (
              <div className="font-heading text-3xl text-zinc-500">VS</div>
            )}
            <div className={`mt-2 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${clock.injury ? "bg-yellow-400/15 text-yellow-300" : isLive ? "bg-neon-green/15 neon-text-green" : "text-zinc-500"}`} data-testid="match-clock">
              <Timer className="w-3.5 h-3.5" /> {clock.label}
            </div>
          </div>
          <TeamBlock t={d.away} last5={d.away_last5} testid="match-away" />
        </div>

        {/* scorers */}
        {(d.goal_events || []).length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-2 justify-center" data-testid="match-scorers">
            {d.goal_events.map((ev, i) => {
              const t = ev.team_id === d.home?.id ? d.home : d.away;
              return <span key={i} className="text-xs glass rounded-full px-3 py-1 flex items-center gap-1">{ev.type === "correction" ? <Repeat className="w-3 h-3 text-yellow-400" /> : <Goal className="w-3 h-3 text-neon-green" />} {teamName(t)}</span>;
            })}
          </div>
        )}
      </div>

      {/* Management controls */}
      {can && !finished && (
        <div className="glass rounded-3xl p-4" data-testid="match-controls">
          <div className="text-xs font-bold text-zinc-400 mb-3 tracking-wide">MAÇ KONTROLÜ {d.can_manage && <span className="neon-text-blue">· Yetkilisiniz</span>}</div>
          <div className="flex flex-wrap gap-2">
            {d.live_state === "scheduled" && (
              <button disabled={busy} onClick={() => act("start-first-half")} data-testid="ctrl-start-1h" className="btn-primary rounded-full px-4 py-2.5 flex items-center gap-2"><PlayCircle className="w-4 h-4" /> İlk Yarıyı Başlat</button>
            )}
            {d.live_state === "first_half" && (
              <button disabled={busy} onClick={() => act("end-first-half")} data-testid="ctrl-end-1h" className="rounded-full px-4 py-2.5 bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 flex items-center gap-2"><FlagOff className="w-4 h-4" /> İlk Yarıyı Bitir</button>
            )}
            {d.live_state === "halftime" && (
              <button disabled={busy} onClick={() => act("start-second-half")} data-testid="ctrl-start-2h" className="btn-primary rounded-full px-4 py-2.5 flex items-center gap-2"><PlayCircle className="w-4 h-4" /> İkinci Yarıyı Başlat</button>
            )}
            {(d.live_state === "first_half" || d.live_state === "second_half") && (
              <>
                <button disabled={busy} onClick={() => setGoalPick(true)} data-testid="ctrl-goal" className="rounded-full px-4 py-2.5 bg-neon-green/15 border border-neon-green/40 neon-text-green flex items-center gap-2"><Goal className="w-4 h-4" /> Gol Bildir</button>
                <button disabled={busy} onClick={() => setCorrectPick(true)} data-testid="ctrl-correct" className="rounded-full px-4 py-2.5 glass border border-white/15 flex items-center gap-2"><Repeat className="w-4 h-4" /> Gol Düzelt</button>
              </>
            )}
            {(d.live_state === "halftime" || d.live_state === "second_half" || d.live_state === "first_half") && (
              <button disabled={busy} onClick={endMatch} data-testid="ctrl-end-match" className="rounded-full px-4 py-2.5 bg-red-500/15 border border-red-500/40 text-red-300 flex items-center gap-2"><FlagOff className="w-4 h-4" /> Maçı Bitir</button>
            )}
          </div>
          {d.live_state === "scheduled" && <p className="text-[11px] text-zinc-500 mt-3">10 dk'lık maç 90 dk'ye sığdırılır. İlk yarı ~5 dk, devre arası 1.5 dk, ikinci yarı ~5 dk. Uzatmaları beklemeden bitirebilirsiniz.</p>}
        </div>
      )}

      {/* Match-specific magazine: founder/assigned admin can post once started */}
      {can && started && (
        <div className="mt-4 flex justify-end">
          <button onClick={() => setNewsOpen(true)} data-testid="match-news-btn" className="rounded-full px-4 py-2.5 glass border border-neon-blue/40 neon-text-blue flex items-center gap-2 hover:bg-neon-blue/10 transition-colors">
            <Newspaper className="w-4 h-4" /> Maça Özel Magazin
          </button>
        </div>
      )}

      {/* Karşılaşma Haberleri */}
      {news.length > 0 && (
        <div className="glass rounded-3xl p-4 sm:p-5 mt-5" data-testid="match-news-section">
          <h3 className="font-heading text-lg mb-3 flex items-center gap-2"><Newspaper className="w-5 h-5 text-neon-blue" /> Karşılaşma Haberleri</h3>
          <div className="space-y-4">
            {news.map((it) => (
              <div key={it.id} data-testid={`match-news-${it.id}`} className="glass rounded-2xl p-4">
                {it.video_url ? (
                  <div className="mb-3"><VideoPlayer url={it.video_url} /></div>
                ) : it.image_url ? (
                  <img src={it.image_url} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />
                ) : null}
                <div className="font-semibold">{it.title}</div>
                {it.body && <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{it.body}</p>}
                {it.created_at && <div className="text-[10px] text-zinc-600 mt-2">{new Date(it.created_at).toLocaleString("tr-TR")}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={newsOpen} onOpenChange={(v) => !v && setNewsOpen(false)}>
        <DialogContent className="glass-strong border-white/10 text-white sm:max-w-md max-h-[88vh] overflow-y-auto thin-scroll" data-testid="match-news-dialog">
          <DialogHeader><DialogTitle className="font-heading flex items-center gap-2"><Newspaper className="w-5 h-5 text-neon-blue" /> Maça Özel Magazin</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-1">
            <Input value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} placeholder="Başlık" data-testid="match-news-title" className="bg-white/5 border-white/15" />
            <Textarea value={newsForm.body} onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} placeholder="Açıklama..." rows={3} className="bg-white/5 border-white/15" />
            <ImageUpload value={newsForm.image_url} onChange={(u) => setNewsForm({ ...newsForm, image_url: u })} label="Görsel (opsiyonel)" testid="match-news-image" />
            <div className="rounded-2xl border border-white/10 p-3 space-y-3">
              <span className="label-xs text-neon-blue">Video (opsiyonel)</span>
              <VideoUpload value={newsForm.video_file} onChange={(u) => setNewsForm({ ...newsForm, video_file: u })} label="Cihazdan Video" testid="match-news-video" />
              <div><span className="label-xs">veya YouTube Linki</span><Input value={newsForm.youtube} onChange={(e) => setNewsForm({ ...newsForm, youtube: e.target.value })} placeholder="https://youtu.be/..." className="mt-1 bg-white/5 border-white/15" /></div>
            </div>
            <button onClick={submitNews} disabled={newsBusy} data-testid="match-news-submit" className="btn-primary w-full rounded-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
              {newsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Yayınla
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <PickTeamDialog open={goalPick} title="Gol atan takım?" home={d.home} away={d.away} onClose={() => setGoalPick(false)} onPick={(tid) => { setGoalPick(false); act("goal", { team_id: tid }); }} />
      <PickTeamDialog open={correctPick} title="Golü atan GERÇEK takım?" home={d.home} away={d.away} onClose={() => setCorrectPick(false)} onPick={(tid) => { setCorrectPick(false); act("correct-goal", { team_id: tid }); }} />
      <PickTeamDialog open={penPick} title="Penaltıları kazanan takım?" home={d.home} away={d.away} onClose={() => setPenPick(false)} onPick={(tid) => { setPenPick(false); act("end-match", { pen_winner_team_id: tid }); }} />
    </Layout>
  );
}
