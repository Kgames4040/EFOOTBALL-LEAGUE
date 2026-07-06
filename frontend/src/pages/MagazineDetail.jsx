import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Newspaper, ArrowLeft, Crown, Loader2 } from "lucide-react";
import { VideoPlayer } from "../components/VideoPlayer";
import { MentionChips } from "../components/MentionChips";
import { MentionText } from "../components/MentionText";
import { optimizeImage } from "../lib/image";
import { youtubeId } from "../lib/video";
import api from "../lib/api";

export default function MagazineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/magazine/${id}`)
      .then((r) => {
        if (!alive) return;
        setItem(r.data);
      })
      .catch(() => {
        if (!alive) return;
        setError("Haber bulunamadı veya kaldırılmış.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
        </div>
      </Layout>
    );
  }

  if (error || !item) {
    return (
      <Layout>
        <div className="glass rounded-3xl p-10 text-center max-w-lg mx-auto mt-10">
          <Newspaper className="w-12 h-12 mx-auto mb-3 text-zinc-500" />
          <div className="font-heading text-2xl mb-2">Haber bulunamadı</div>
          <p className="text-zinc-400 text-sm mb-4">{error || "Bu içerik silinmiş olabilir."}</p>
          <button onClick={() => navigate("/")} className="btn-primary rounded-full px-5 py-2">Ana Sayfa</button>
        </div>
      </Layout>
    );
  }

  const isYT = !!youtubeId(item.video_url || "");
  const heroImg = item.image_url ? optimizeImage(item.image_url, { w: 1200, h: 675 }) : "";

  return (
    <Layout>
      <div className="max-w-3xl mx-auto" data-testid="magazine-detail">
        <button
          onClick={() => navigate(-1)}
          data-testid="magazine-back-btn"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>

        <article className="glass rounded-3xl overflow-hidden">
          {/* Header title bar */}
          <header className="p-5 sm:p-7 border-b border-white/5 bg-gradient-to-r from-neon-blue/10 to-fuchsia-500/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-neon-blue/15 flex items-center justify-center shrink-0">
                <Newspaper className="w-5 h-5 text-neon-blue" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {item.is_leader_highlight && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      <Crown className="w-3 h-3" /> LİDER
                    </span>
                  )}
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400">Magazin</span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl leading-tight" data-testid="magazine-detail-title">{item.title}</h1>
                {item.created_at && (
                  <div className="text-[11px] text-zinc-500 mt-1.5">
                    {new Date(item.created_at).toLocaleString("tr-TR")}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Media */}
          {(item.video_url || heroImg) && (
            <div className="p-4 sm:p-6 pb-0">
              {item.video_url ? (
                <VideoPlayer url={item.video_url} data-testid="magazine-detail-video" />
              ) : heroImg ? (
                <img
                  src={heroImg}
                  alt={item.title}
                  className="w-full max-h-[60vh] object-contain rounded-2xl bg-black/40"
                  data-testid="magazine-detail-image"
                />
              ) : null}
              {isYT && (
                <div className="mt-2 text-[11px] text-zinc-500 text-center">
                  YouTube oynatıcısı otomatik yüklendi
                </div>
              )}
            </div>
          )}

          {/* Body (scrollable if long) */}
          {item.body && (
            <div
              className="p-5 sm:p-7 max-h-[62vh] overflow-y-auto thin-scroll text-[15px] leading-7 text-zinc-200 whitespace-pre-wrap"
              data-testid="magazine-detail-body"
            >
              <MentionText text={item.body} mentions={item.mentions} />
            </div>
          )}

          {/* Mention chips at bottom */}
          {item.mentions && item.mentions.length > 0 && (
            <div className="px-5 sm:px-7 pb-6">
              <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Bağlantılar</div>
              <MentionChips mentions={item.mentions} />
            </div>
          )}
        </article>
      </div>
    </Layout>
  );
}
