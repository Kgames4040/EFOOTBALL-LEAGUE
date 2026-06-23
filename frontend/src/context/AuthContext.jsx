import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { registerServiceWorker } from "../lib/push";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=guest, obj=auth
  const [team, setTeam] = useState(null);

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
      // Load the team BEFORE exposing the user, otherwise RootRoute briefly
      // sees user set + team null and wrongly redirects to /onboarding on refresh.
      if (data.role !== "admin") await loadTeam();
      setUser(data);
    } catch {
      localStorage.removeItem("token");
      setUser(false);
    }
  }, [loadTeam]);

  useEffect(() => {
    registerServiceWorker();
    refreshUser();
  }, [refreshUser]);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    if (data.user.role !== "admin") await loadTeam();
    return data.user;
  };

  const register = async (username, password) => {
    const { data } = await api.post("/auth/register", { username, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(false);
    setTeam(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, team, setTeam, loadTeam, refreshUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
