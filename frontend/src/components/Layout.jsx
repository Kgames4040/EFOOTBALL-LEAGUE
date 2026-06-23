import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Home, Users, Shield, LogOut, Bell, Sparkles, RotateCw, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useAuth } from "../context/AuthContext";
import { enablePush } from "../lib/push";
import { ProfileDialog } from "./ProfileDialog";
import { toast } from "sonner";

function NavItem({ icon: Icon, label, onClick, active, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
        active ? "bg-neon-blue/15 text-neon-blue neon-border-green border border-neon-blue/30" : "hover:bg-white/5 text-zinc-300"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

export function Layout({ children }) {
  const { user, team, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const handlePush = async () => {
    try {
      await enablePush();
      toast.success("Bildirimler açıldı! Maç başladığında haber alacaksınız.");
    } catch (e) {
      toast.error(e.message || "Bildirim açılamadı");
    }
  };

  const manager = team?.manager;

  return (
    <div className="min-h-screen">
      <div className="app-bg" />
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-white/10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button data-testid="hamburger-btn" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="glass-strong border-white/10 text-white w-72 p-0">
                <SheetHeader className="p-5 border-b border-white/10" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
                  <SheetTitle className="font-heading flex items-center gap-2 text-white">
                    <img src="/icon-192.png" alt="" className="w-7 h-7" />
                    eFootball Lig
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-3 space-y-1">
                  <NavItem icon={Home} label="Ana Sayfa" testid="nav-home" active={location.pathname === "/"} onClick={() => go("/")} />
                  {user?.role !== "admin" && (
                    <NavItem icon={Shield} label="Takımım" testid="nav-myteam" active={location.pathname === "/my-team"} onClick={() => go("/my-team")} />
                  )}
                  <NavItem icon={Users} label="Takımlar" testid="nav-teams" active={location.pathname.startsWith("/teams")} onClick={() => go("/teams")} />
                  {user?.role === "admin" && (
                    <NavItem icon={Sparkles} label="Admin Paneli" testid="nav-admin" active={location.pathname === "/admin"} onClick={() => go("/admin")} />
                  )}
                  <div className="pt-2 mt-2 border-t border-white/10">
                    <NavItem icon={Bell} label="Bildirimleri Aç" testid="nav-push" onClick={handlePush} />
                    <NavItem icon={LogOut} label="Çıkış Yap" testid="nav-logout" onClick={() => { logout(); navigate("/login"); }} />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <img src="/icon-192.png" alt="logo" className="w-8 h-8" />
              <span className="font-heading font-extrabold text-lg hidden sm:block tracking-tight">
                eFootball<span className="neon-text-blue"> LİG</span>
              </span>
            </button>
          </div>

          {/* Right: refresh + team value + manager */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              data-testid="refresh-btn"
              aria-label="Yenile"
              className="p-2 rounded-full hover:bg-white/10 active:rotate-180 transition-transform duration-300"
            >
              <RotateCw className="w-5 h-5 text-neon-blue" />
            </button>
            {team && (
              <div className="text-right hidden xs:block">
                <div className="label-xs">Takım Değeri</div>
                <div className="font-heading neon-text-green text-sm" data-testid="header-team-value">€{team.value}M</div>
              </div>
            )}
            <button
              onClick={() => setProfileOpen(true)}
              data-testid="profile-menu-btn"
              className="flex items-center gap-2 glass rounded-full pl-1 pr-2 py-1 hover:bg-white/10 transition-colors"
            >
              {manager?.photo_url ? (
                <img src={manager.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-white/15" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-neon-blue/20 border border-neon-blue/30 flex items-center justify-center text-sm font-bold neon-text-blue">
                  {(manager?.name || user?.username || "?")[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium hidden md:block max-w-[120px] truncate">{manager?.name || user?.username}</span>
              {user?.role === "admin" && (
                <span className="px-2 py-0.5 rounded-full bg-neon-blue/15 border border-neon-blue/30 text-[10px] font-bold neon-text-blue">ADMIN</span>
              )}
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 animate-fade-up">{children}</main>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
