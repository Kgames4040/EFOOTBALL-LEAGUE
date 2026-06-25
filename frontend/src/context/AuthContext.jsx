import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { registerServiceWorker } from "../lib/push";

const AuthContext = createContext(null);
export const isStaff = (r) => r === "admin" || r === "founder";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=guest, obj=auth
  const [team, setTeam] = useState(null);
  const [branding, setBranding] = useState({ app_name: "eFootball Lig", logo_url: "", favicon_url: "" });

  const loadBranding = useCallback(async () => {
    try {
      const { data } = await api.get("/branding");
      setBranding(data);
      if (data.app_name) document.title = data.app_name;
      if (data.favicon_url) {
        let link = document.querySelector("link[rel='icon']");
        if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
        link.href = data.favicon_url;
      }
      return data;
    } catch { return null; }
  }, []);

  const loadTeam = useCallback(async () => {
    try {
      const { data } = await api.get("/teams/me");
      setTeam(data);
      return data;
    } catch {
      setTeam(null);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      localStorage.setItem("cached_user", JSON.stringify(data));
      if (!isStaff(data.role)) await loadTeam();
      setUser(data);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        // genuinely invalid token -> log out
        localStorage.removeItem("token");
        localStorage.removeItem("cached_user");
        setUser(false);
      } else {
        // network error / backend cold (5xx) -> keep session, use cached user
        const cached = localStorage.getItem("cached_user");
        if (cached) {
          const cu = JSON.parse(cached);
          if (!isStaff(cu.role)) loadTeam();
          setUser(cu);
        } else {
          setUser(false);
        }
      }
    }
  }, [loadTeam]);

  useEffect(() => {
    registerServiceWorker();
    loadBranding();
    refreshUser();
  }, [refreshUser, loadBranding]);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("cached_user", JSON.stringify(data.user));
    setUser(data.user);
    if (!isStaff(data.user.role)) await loadTeam();
    return data.user;
  };

  const register = async (username, password) => {
    const { data } = await api.post("/auth/register", { username, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("cached_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cached_user");
    setUser(false);
    setTeam(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, team, setTeam, branding, loadBranding, loadTeam, refreshUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
