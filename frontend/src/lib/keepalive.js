import { useEffect } from "react";
import api from "./api";

// Sends a lightweight ping every N minutes while the app is open in the tab.
// This alone keeps Render free-tier backend awake as long as at least one
// user has the site open. For 24/7 uptime, pair with an external cron
// (UptimeRobot, cron-job.org) hitting /api/keepalive every 10 minutes.
export function useBackendKeepalive({ intervalMs = 10 * 60 * 1000 } = {}) {
  useEffect(() => {
    let cancelled = false;
    const ping = () => {
      // Fire and forget; we don't care about errors here.
      api.get("/keepalive").catch(() => {});
    };
    // Initial ping shortly after mount (helps warm cold Render).
    const first = setTimeout(() => {
      if (!cancelled) ping();
    }, 2000);
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      ping();
    }, intervalMs);
    // Also ping when tab becomes visible again.
    const onVis = () => {
      if (typeof document !== "undefined" && !document.hidden) ping();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }, [intervalMs]);
}
