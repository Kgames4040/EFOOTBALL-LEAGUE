import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
        toast.success("Hesap oluşturuldu! Şimdi takımını kur.");
      }
      navigate("/");
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
        className="w-full max-w-md glass rounded-3xl p-8 relative overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-neon-blue/15 blur-3xl rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-neon-green/10 blur-3xl rounded-full" />

        <div className="flex flex-col items-center mb-6 relative">
          <img src="/icon-192.png" alt="logo" className="w-16 h-16 mb-3 drop-shadow-[0_0_18px_rgba(0,245,255,0.5)]" />
          <h1 className="font-heading font-extrabold text-3xl tracking-tight">
            eFootball<span className="neon-text-blue"> LİG</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Lig & Turnuva Yönetim Merkezi</p>
        </div>

        <div className="flex gap-1 p-1 bg-white/5 rounded-full mb-6 relative">
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setErr(""); }}
              data-testid={`tab-${m}`}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${
                mode === m ? "btn-primary" : "text-zinc-400 hover:text-white"
              }`}
            >
              {m === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === "login" ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "login" ? 30 : -30 }}
            transition={{ duration: 0.25 }}
            onSubmit={submit}
            className="space-y-4"
          >
            <div>
              <span className="label-xs">Kullanıcı Adı</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="kullanıcı adınız"
                data-testid="username-input"
                className="mt-1 bg-white/5 border-white/15 h-11"
                required
              />
            </div>
            <div>
              <span className="label-xs">Şifre</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="password-input"
                className="mt-1 bg-white/5 border-white/15 h-11"
                required
              />
            </div>
            {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" data-testid="auth-error">{err}</div>}
            <button type="submit" disabled={loading} data-testid="auth-submit" className="btn-primary w-full rounded-full py-3 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "Giriş Yap" : "Kayıt Ol ve Başla"}
            </button>
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
