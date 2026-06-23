import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { CountrySelect } from "./CountrySelect";
import { flagEmoji } from "../lib/countries";
import { useAuth } from "../context/AuthContext";
import api, { formatError } from "../lib/api";
import { Loader2, User, Shield, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function ProfileDialog({ open, onClose }) {
  const { user, team, setUser, loadTeam, setTeam } = useAuth();
  const [tab, setTab] = useState("account");

  // account
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [savingAcc, setSavingAcc] = useState(false);

  // team
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [logo, setLogo] = useState("");
  const [desc, setDesc] = useState("");
  const [m, setM] = useState({});
  const [country, setCountry] = useState(null);
  const [savingTeam, setSavingTeam] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("account");
      setUsername(user?.username || "");
      setPassword("");
      setShowPass(false);
      if (team) {
        setName(team.name || ""); setAbbr(team.abbreviation || "");
        setLogo(team.logo_url || ""); setDesc(team.description || "");
        setM(team.manager || {});
        setCountry(team.manager?.nationality ? { name: team.manager.nationality } : null);
      }
    }
  }, [open, user, team]);

  const saveAccount = async () => {
    const body = {};
    if (username.trim() && username.trim() !== user?.username) body.username = username.trim();
    if (password) body.password = password;
    if (!body.username && !body.password) { toast.message("Değişiklik yok"); return; }
    setSavingAcc(true);
    try {
      const { data } = await api.put("/auth/me", body);
      if (data.token) localStorage.setItem("token", data.token);
      setUser(data.user);
      setPassword("");
      toast.success("Hesap bilgileri güncellendi");
    } catch (e) {
      toast.error(formatError(e.response?.data?.detail));
    } finally { setSavingAcc(false); }
  };

  const saveTeam = async () => {
    setSavingTeam(true);
    try {
      const { data } = await api.put("/teams/me/info", {
        name, abbreviation: abbr, logo_url: logo, description: desc,
        manager: {
          ...m,
          nationality: country?.name || m.nationality || "",
          flag: country?.code ? flagEmoji(country.code) : m.flag || "",
        },
      });
      setTeam(data);
      await loadTeam();
      toast.success("Takım & TD bilgileri güncellendi");
    } catch (e) {
      toast.error(formatError(e.response?.data?.detail));
    } finally { setSavingTeam(false); }
  };

  const hasTeam = !!team && user?.role !== "admin";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-white sm:max-w-lg max-h-[88vh] overflow-y-auto thin-scroll" data-testid="profile-dialog">
        <DialogHeader><DialogTitle className="font-heading flex items-center gap-2"><User className="w-5 h-5 text-neon-blue" /> Profilim</DialogTitle></DialogHeader>

        {hasTeam && (
          <div className="flex gap-2 p-1 glass rounded-full mb-1">
            <button onClick={() => setTab("account")} data-testid="profile-tab-account" className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${tab === "account" ? "btn-primary" : "text-zinc-300"}`}>Hesap</button>
            <button onClick={() => setTab("team")} data-testid="profile-tab-team" className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${tab === "team" ? "btn-primary" : "text-zinc-300"}`}>Takım & TD</button>
          </div>
        )}

        {(tab === "account" || !hasTeam) && (
          <div className="space-y-4" data-testid="profile-account-section">
            <div>
              <span className="label-xs">Kullanıcı Adı</span>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} data-testid="profile-username-input" className="mt-1 bg-white/5 border-white/15" />
            </div>
            <div>
              <span className="label-xs">Yeni Şifre <span className="text-zinc-600">(boş bırakırsanız değişmez)</span></span>
              <div className="relative mt-1">
                <Input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" data-testid="profile-password-input" className="bg-white/5 border-white/15 pr-10" />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" data-testid="profile-toggle-pass">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button onClick={saveAccount} disabled={savingAcc} data-testid="profile-save-account-btn" className="btn-primary w-full rounded-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
              {savingAcc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Hesabı Kaydet
            </button>
          </div>
        )}

        {tab === "team" && hasTeam && (
          <div className="space-y-4" data-testid="profile-team-section">
            <div className="flex gap-4">
              <ImageUpload value={logo} onChange={setLogo} label="Logo" round testid="profile-logo" />
              <ImageUpload value={m.photo_url} onChange={(u) => setM({ ...m, photo_url: u })} label="TD Foto" round testid="profile-mgr-photo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="label-xs">Takım Adı</span><Input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-team-name" className="mt-1 bg-white/5 border-white/15" /></div>
              <div><span className="label-xs">Kısaltma</span><Input value={abbr} maxLength={3} onChange={(e) => setAbbr(e.target.value.toUpperCase().slice(0, 3))} data-testid="profile-team-abbr" className="mt-1 bg-white/5 border-white/15 uppercase" /></div>
              <div><span className="label-xs">TD İsim</span><Input value={m.name || ""} onChange={(e) => setM({ ...m, name: e.target.value })} data-testid="profile-td-name" className="mt-1 bg-white/5 border-white/15" /></div>
              <div><span className="label-xs">Doğum T.</span><Input type="date" value={m.birthdate || ""} onChange={(e) => setM({ ...m, birthdate: e.target.value })} className="mt-1 bg-white/5 border-white/15" /></div>
              <div><span className="label-xs">Memleket</span><Input value={m.hometown || ""} onChange={(e) => setM({ ...m, hometown: e.target.value })} className="mt-1 bg-white/5 border-white/15" /></div>
              <div><span className="label-xs">Ülke</span><div className="mt-1"><CountrySelect value={country?.name} onChange={setCountry} testid="profile-country" /></div></div>
            </div>
            <div><span className="label-xs">Açıklama</span><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 bg-white/5 border-white/15" rows={2} data-testid="profile-desc" /></div>
            <button onClick={saveTeam} disabled={savingTeam} data-testid="profile-save-team-btn" className="btn-primary w-full rounded-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
              {savingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Takım Bilgilerini Kaydet
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
