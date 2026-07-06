import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import api from "../lib/api";
import { Users } from "lucide-react";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/teams").then((r) => setTeams(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1 className="font-heading font-extrabold text-2xl sm:text-3xl mb-6 flex items-center gap-2">
        <Users className="w-7 h-7 text-neon-blue" /> Takımlar
      </h1>
      {loading ? (
        <div className="text-zinc-500 py-10 text-center">Yükleniyor...</div>
      ) : teams.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-zinc-400">Henüz takım yok.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/teams/${t.id}`)}
              data-testid={`team-card-${t.id}`}
              className="glass rounded-2xl p-5 text-left hover:-translate-y-1 transition-transform group"
            >
              <div className="flex items-center gap-3">
                {t.logo_url ? (
                  <img src={t.logo_url} alt="" className="w-14 h-14 rounded-full object-cover border border-white/15 group-hover:border-neon-blue/50 transition-colors" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center font-heading font-bold">{t.abbreviation}</div>
                )}
                <div className="min-w-0">
                  <div className="font-heading font-bold text-lg truncate">{t.name}</div>
                  <div className="text-xs text-zinc-500">{t.abbreviation} · {t.owner}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-zinc-400">{t.player_count} oyuncu</span>
                <span className="font-heading font-bold neon-text-green">€{t.value}M</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Layout>
  );
}
