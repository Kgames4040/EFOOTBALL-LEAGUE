import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import api, { formatError } from "../lib/api";
import { toast } from "sonner";

// Two-stage cancel flow: (1) confirm, (2) reason (+ cup decision). mode: "league" | "cup".
export function CancelMatchDialog({ open, onClose, match, mode = "league", onDone }) {
  const [stage, setStage] = useState("confirm");
  const [reason, setReason] = useState("");
  const [cupAction, setCupAction] = useState("both_out");
  const [advanceTeam, setAdvanceTeam] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStage("confirm");
      setReason("");
      setCupAction("both_out");
      setAdvanceTeam("");
    }
  }, [open, match]);

  if (!match) return null;
  const homeName = match.home?.name || match.home?.abbreviation || "?";
  const awayName = match.away?.name || match.away?.abbreviation || "?";

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "cup") {
        if (cupAction === "advance" && !advanceTeam) {
          setBusy(false);
          return toast.error("Üst tura çıkacak takımı seçin");
        }
        await api.post(`/admin/cup/match/${match.id}/cancel`, {
          reason,
          cup_action: cupAction,
          advance_team_id: cupAction === "advance" ? advanceTeam : null,
        });
      } else {
        await api.post(`/admin/matches/${match.id}/cancel`, { reason });
      }
      toast.success("Maç iptal edildi, magazine gönderildi");
      onDone && onDone();
      onClose();
    } catch (e) {
      toast.error(formatError(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong border-white/10 text-white sm:max-w-md" data-testid="cancel-match-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" /> Maçı İptal Et
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-zinc-300 mb-2">{homeName} <span className="text-zinc-500">vs</span> {awayName}</div>

        {stage === "confirm" ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Bu maçı iptal etmek istediğinize emin misiniz?</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full py-2.5 bg-white/10 border border-white/20" data-testid="cancel-abort-btn">Vazgeç</button>
              <button onClick={() => setStage("reason")} data-testid="cancel-confirm-btn" className="flex-1 rounded-full py-2.5 bg-red-500/20 border border-red-500/50 text-red-200 hover:bg-red-500/30 transition-colors">Evet, İptal Et</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="label-xs">İptal Sebebi</span>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Maçın iptal sebebini yazın..." rows={3} className="mt-1 bg-white/5 border-white/15" data-testid="cancel-reason-input" />
            </div>

            {mode === "cup" && (
              <div className="space-y-2">
                <span className="label-xs">Kupada ne olsun?</span>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="cup-action" checked={cupAction === "both_out"} onChange={() => setCupAction("both_out")} data-testid="cup-action-both-out" />
                  İki takım da elensin
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="cup-action" checked={cupAction === "advance"} onChange={() => setCupAction("advance")} data-testid="cup-action-advance" />
                  Bir takım üst tura çıksın
                </label>
                {cupAction === "advance" && (
                  <select value={advanceTeam} onChange={(e) => setAdvanceTeam(e.target.value)} data-testid="cup-advance-select" className="w-full bg-ink-900 border border-white/15 rounded-lg px-2 py-2 text-sm">
                    <option value="">Takım seç</option>
                    {match.home && <option value={match.home.id}>{homeName}</option>}
                    {match.away && <option value={match.away.id}>{awayName}</option>}
                  </select>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full py-2.5 bg-white/10 border border-white/20">Vazgeç</button>
              <button onClick={submit} disabled={busy} data-testid="cancel-submit-btn" className="flex-1 rounded-full py-2.5 bg-red-500/20 border border-red-500/50 text-red-200 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Maçı İptal Et
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
