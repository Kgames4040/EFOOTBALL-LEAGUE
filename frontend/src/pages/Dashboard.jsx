import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { StandingsTable } from "../components/StandingsTable";
import { FixtureScroll } from "../components/FixtureScroll";
import { MatchRow } from "../components/FixtureScroll";
import { LeaderHighlight, MagazineFeed } from "../components/StatsWidgets";
import { MagazineArchive } from "../components/MagazineArchive";
import { ExpandableSection, StandingsPreview, FixturePreview } from "../components/HomeSections";
import { CupBracket, CupSummaryModal } from "../components/CupBracket";
import { FullscreenModal } from "../components/FullscreenModal";
import { useAuth } from "../context/AuthContext";
import { tournamentCover } from "../lib/image";
import api from "../lib/api";
import { Trophy, PauseCircle, CalendarDays, Sparkles, ShieldHalf, Maximize2 } from "lucide-react";

function ExhibitionSection({ matches }) {
  if (!matches || matches.length === 0) return null;
  return (
    <section className="glass rounded-3xl p-4 sm:p-5" data-testid="exhibition-section">
      <h3 className="font-heading text-lg sm:text-xl mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-neon-blue" /> GÖSTERİ MAÇLARI
      </h3>
      <div className="space-y-2">
        {matches.map((m) => <MatchRow key={m.id} m={m} />)}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [magazine, setMagazine] = useState([]);
  const [bracket, setBracket] = useState(null);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [standingsFull, setStandingsFull] = useState(false);
  const [fixtureFull, setFixtureFull] = useState(false);

  const load = async () => {
    try {
      try { const ex = await api.get("/exhibition-matches"); setExhibitions(ex.data || []); } catch { /* ignore */ }
      const t = await api.get("/tournament/active");
      const tour = t.data;
      setTournament(tour);
      if (tour && tour.mode === "cup") {
        const [b, mg] = await Promise.all([api.get("/cup/bracket"), api.get("/magazine")]);
        setBracket(b.data);
        setMagazine(mg.data);
      } else if (tour) {
        const [s, m, mg] = await Promise.all([api.get("/standings"), api.get("/matches"), api.get("/magazine")]);
        setStandings(s.data);
        setMatches(m.data);
        setMagazine(mg.data);
      } else {
        const mg = await api.get("/magazine");
        setMagazine(mg.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mid = searchParams.get("magazine");
    if (mid) {
      // Old query pattern → redirect to dedicated detail page.
      navigate(`/magazine/${mid}`, { replace: true });
      return;
    }
    const section = searchParams.get("section");
    if (section) {
      if (section === "standings") setStandingsFull(true);
      else if (section === "fixture") setFixtureFull(true);
      else if (section === "cup") setSummaryOpen(true);
      else if (section === "magazine") { setSelected(null); setArchiveOpen(true); }
      else if (section === "exhibition") {
        // Scroll into view if exhibition section exists.
        const el = typeof document !== "undefined" ? document.querySelector('[data-testid="exhibition-section"]') : null;
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      const sp = new URLSearchParams(searchParams);
      sp.delete("section");
      setSearchParams(sp, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (loading) {
    return <Layout><div className="text-center text-zinc-500 py-20">Yükleniyor...</div></Layout>;
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="glass rounded-3xl p-10 text-center max-w-lg mx-auto mt-10" data-testid="no-tournament-screen">
          <Trophy className="w-14 h-14 mx-auto mb-4 text-neon-blue/70 drop-shadow-[0_0_18px_rgba(0,245,255,0.4)]" />
          <h2 className="font-heading text-3xl mb-2">AKTİF TURNUVA YOK</h2>
          <p className="text-zinc-400 text-sm">
            {user?.role === "admin"
              ? "Lige başlamak için yeni bir turnuva veya kupa oluşturun."
              : "Yönetici yeni bir turnuva başlattığında lig burada görünecek. Bu sırada takımını hazırlayabilirsin!"}
          </p>
          {user?.role === "admin" && (
            <button onClick={() => navigate("/admin")} data-testid="cta-create-tournament" className="btn-primary rounded-full px-6 py-3 mt-5 inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Turnuva / Kupa Başlat
            </button>
          )}
        </div>
      </Layout>
    );
  }

  const paused = tournament.status === "paused";
  const isCup = tournament.mode === "cup";

  const Hero = (
    <div className="relative rounded-3xl overflow-hidden glass mb-6" data-testid="tournament-hero">
      {tournament.cover_url && (
        <div className="absolute inset-0 overflow-hidden">
          <img src={tournamentCover(tournament.cover_url)} alt="" className="w-full h-full object-cover opacity-30 blur-3xl scale-125" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="relative p-5 sm:p-8 flex items-center gap-4 sm:gap-5">
        {tournament.cover_url && (
          <img
            src={tournamentCover(tournament.cover_url)}
            alt=""
            className="hidden sm:block w-24 h-24 rounded-2xl object-contain bg-black/40 border border-white/10 shadow-[0_0_18px_rgba(0,245,255,0.25)] shrink-0 p-1"
            data-testid="tournament-hero-image"
          />
        )}
        <div className="min-w-0 flex-1">
          <span className="label-xs neon-text-green">{isCup ? "Aktif Kupa" : "Aktif Turnuva"}</span>
          <h1 className="font-heading text-3xl sm:text-5xl mt-1 flex items-center gap-3">
            {isCup ? <ShieldHalf className="w-7 h-7 sm:w-8 sm:h-8 text-neon-blue" /> : <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-400" />}
            <span className="truncate">{tournament.name}</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{isCup ? "Eleme Usulü Kupa · Tek Maç" : `${tournament.weeks} Hafta · Çift Devreli Lig`}</p>
        </div>
      </div>
    </div>
  );

  const PausedBanner = paused && (
    <div className="mb-6 flex items-center gap-3 glass rounded-2xl px-5 py-4 border border-yellow-500/30" data-testid="paused-banner">
      <PauseCircle className="w-6 h-6 text-yellow-400 shrink-0" />
      <div>
        <div className="font-heading text-yellow-400 text-lg">TURNUVA GEÇİCİ OLARAK DURDURULDU</div>
        <div className="text-xs text-zinc-400">Maç başlatma ve skor girişi geçici olarak kapalı.</div>
      </div>
    </div>
  );

  if (isCup) {
    return (
      <Layout>
        {Hero}
        {PausedBanner}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0">
            <CupBracket bracket={bracket} onOpenSummary={() => setSummaryOpen(true)} />
            <div className="mt-6"><ExhibitionSection matches={exhibitions} /></div>
          </div>
          <div className="space-y-6">
            <MagazineFeed
              items={magazine}
              onOpenAll={() => { setSelected(null); setArchiveOpen(true); }}
              onSelect={(it) => { setSelected(it); setArchiveOpen(true); }}
            />
          </div>
        </div>
        <CupSummaryModal open={summaryOpen} onClose={() => setSummaryOpen(false)} />
        <MagazineArchive open={archiveOpen} onClose={() => setArchiveOpen(false)} items={magazine} initial={selected} />
      </Layout>
    );
  }

  return (
    <Layout>
      {Hero}
      {PausedBanner}

      {/* Mobile: preview-first, tap to expand (vertical scroll, no horizontal overflow) */}
      <div className="lg:hidden space-y-6">
        <div>
          <ExpandableSection
            icon={CalendarDays}
            title="PUAN DURUMU"
            hint="Tüm tablo"
            testid="standings-section"
            defaultOpen={false}
            preview={<StandingsPreview rows={standings} />}
          >
            <StandingsTable rows={standings} />
          </ExpandableSection>
          <button onClick={() => setStandingsFull(true)} data-testid="standings-fullscreen-btn-mobile" className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold neon-text-blue bg-neon-blue/10 border border-neon-blue/30 rounded-full px-3 py-2 hover:bg-neon-blue/20 transition-colors">
            <Maximize2 className="w-3.5 h-3.5" /> Tam ekran için tıklayınız
          </button>
        </div>

        <div>
          <ExpandableSection
            icon={CalendarDays}
            title="FİKSTÜR"
            hint="Tümü"
            testid="fixture-section"
            defaultOpen={false}
            preview={<FixturePreview matches={matches} />}
          >
            <FixtureScroll matches={matches} vertical />
          </ExpandableSection>
          <button onClick={() => setFixtureFull(true)} data-testid="fixture-fullscreen-btn-mobile" className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold neon-text-blue bg-neon-blue/10 border border-neon-blue/30 rounded-full px-3 py-2 hover:bg-neon-blue/20 transition-colors">
            <Maximize2 className="w-3.5 h-3.5" /> Tam ekran için tıklayınız
          </button>
        </div>

        <ExhibitionSection matches={exhibitions} />
        <LeaderHighlight leader={standings[0]} />
        <MagazineFeed
          items={magazine}
          onOpenAll={() => { setSelected(null); setArchiveOpen(true); }}
          onSelect={(it) => { setSelected(it); setArchiveOpen(true); }}
        />
      </div>

      {/* Desktop: full layout */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h3 className="font-heading text-xl flex items-center gap-2"><CalendarDays className="w-5 h-5 text-neon-blue" /> PUAN DURUMU</h3>
              <button onClick={() => setStandingsFull(true)} data-testid="standings-fullscreen-btn" className="flex items-center gap-1.5 text-[11px] font-semibold neon-text-blue bg-neon-blue/10 border border-neon-blue/30 rounded-full px-3 py-1.5 hover:bg-neon-blue/20 transition-colors"><Maximize2 className="w-3.5 h-3.5" /> Tam ekran</button>
            </div>
            <StandingsTable rows={standings} />
          </section>
          <section className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h3 className="font-heading text-xl">FİKSTÜR</h3>
              <button onClick={() => setFixtureFull(true)} data-testid="fixture-fullscreen-btn" className="flex items-center gap-1.5 text-[11px] font-semibold neon-text-blue bg-neon-blue/10 border border-neon-blue/30 rounded-full px-3 py-1.5 hover:bg-neon-blue/20 transition-colors"><Maximize2 className="w-3.5 h-3.5" /> Tam ekran için tıklayınız</button>
            </div>
            <FixtureScroll matches={matches} />
          </section>
          <ExhibitionSection matches={exhibitions} />
        </div>
        <div className="space-y-6">
          <LeaderHighlight leader={standings[0]} />
          <MagazineFeed
            items={magazine}
            onOpenAll={() => { setSelected(null); setArchiveOpen(true); }}
            onSelect={(it) => { setSelected(it); setArchiveOpen(true); }}
          />
        </div>
      </div>

      <FullscreenModal open={standingsFull} onClose={() => setStandingsFull(false)} title="Puan Durumu" icon={CalendarDays} testid="standings-fullscreen-modal">
        <StandingsTable rows={standings} />
      </FullscreenModal>
      <FullscreenModal open={fixtureFull} onClose={() => setFixtureFull(false)} title="Fikstür" icon={CalendarDays} testid="fixture-fullscreen-modal">
        <FixtureScroll matches={matches} vertical />
      </FullscreenModal>

      <MagazineArchive open={archiveOpen} onClose={() => setArchiveOpen(false)} items={magazine} initial={selected} />
    </Layout>
  );
}
