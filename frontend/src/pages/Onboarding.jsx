import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { ImageUpload } from "../components/ImageUpload";
import { CountrySelect } from "../components/CountrySelect";
import { flagEmoji } from "../lib/countries";
import { Loader2, ArrowRight, Home } from "lucide-react";
import { toast } from "sonner";

export default function Onboarding() {
  const { loadTeam } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [logo, setLogo] = useState("");
  const [desc, setDesc] = useState("");
  const [mgrName, setMgrName] = useState("");
  const [mgrBirth, setMgrBirth] = useState("");
  const [mgrTown, setMgrTown] = useState("");
  const [country, setCountry] = useState(null);
  const [mgrPhoto, setMgrPhoto] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!name.trim() || abbr.trim().length < 2) {
      setErr("Takım adı ve en az 2 harfli kısaltma gerekli");
      return;
    }
    setLoading(true);
    try {
      await api.post("/teams", {
        name,
        abbreviation: abbr,
        logo_url: logo,
        description: desc,
        manager: {
          name: mgrName,
          birthdate: mgrBirth,
          hometown: mgrTown,
          nationality: country?.name || "",
          flag: country ? flagEmoji(country.code) : "",
          photo_url: mgrPhoto,
        },
      });
      await loadTeam();
      toast.success("Takımın kuruldu! Şimdi kadronu oluştur.");
      navigate("/my-team");
    } catch (e) {
      setErr(formatError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="app-bg" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl glass rounded-3xl p-6 sm:p-8 my-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="label-xs neon-text-blue">Onboarding</span>
            <h1 className="font-heading text-3xl sm:text-4xl mt-1">TAKIMINI KUR</h1>
            <p className="text-zinc-400 text-sm mt-1">Takım kimliğini ve teknik direktör bilgilerini gir.</p>
          </div>
          <button type="button" onClick={() => navigate("/")} data-testid="onboarding-home-btn" className="shrink-0 flex items-center gap-1.5 text-sm glass rounded-full px-4 py-2 hover:bg-white/10 transition-colors">
            <Home className="w-4 h-4" /> Ana Sayfa
          </button>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="label-xs">Takım İsmi</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Neon FC" data-testid="team-name-input" className="mt-1 bg-white/5 border-white/15" required />
            </div>
            <div>
              <span className="label-xs">3 Harfli Kısaltma</span>
              <Input value={abbr} onChange={(e) => setAbbr(e.target.value.toUpperCase().slice(0, 3))} placeholder="NEO" maxLength={3} data-testid="team-abbr-input" className="mt-1 bg-white/5 border-white/15 uppercase" required />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <ImageUpload value={logo} onChange={setLogo} label="Takım Logosu" round testid="team-logo" />
            <ImageUpload value={mgrPhoto} onChange={setMgrPhoto} label="Teknik Direktör Fotoğrafı (opsiyonel)" round testid="manager-photo" />
          </div>

          <div className="border-t border-white/10 pt-5">
            <span className="label-xs neon-text-green">Teknik Direktör Bilgileri</span>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div>
                <span className="label-xs">İsim</span>
                <Input value={mgrName} onChange={(e) => setMgrName(e.target.value)} placeholder="Teknik direktör adı" data-testid="manager-name-input" className="mt-1 bg-white/5 border-white/15" />
              </div>
              <div>
                <span className="label-xs">Doğum Tarihi</span>
                <Input type="date" value={mgrBirth} onChange={(e) => setMgrBirth(e.target.value)} data-testid="manager-birth-input" className="mt-1 bg-white/5 border-white/15" />
              </div>
              <div>
                <span className="label-xs">Memleket</span>
                <Input value={mgrTown} onChange={(e) => setMgrTown(e.target.value)} placeholder="Şehir" data-testid="manager-town-input" className="mt-1 bg-white/5 border-white/15" />
              </div>
              <div>
                <span className="label-xs">Vatandaşlık</span>
                <div className="mt-1">
                  <CountrySelect value={country?.name} onChange={setCountry} testid="manager-country" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="label-xs">Takım / Teknik Direktör Açıklaması</span>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Kısa bir açıklama..." data-testid="team-desc-input" className="mt-1 bg-white/5 border-white/15" rows={3} />
          </div>

          {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</div>}

          <button type="submit" disabled={loading} data-testid="onboarding-submit" className="btn-primary w-full rounded-full py-3 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Devam Et — Kadro Oluştur
          </button>
        </form>
      </motion.div>
    </div>
  );
}
