import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter,
} from "./ui/alert-dialog";

const ConfirmContext = createContext(() => Promise.resolve(true));

/**
 * Promise-based confirm dialog. Replaces native window.confirm() which is
 * unreliable inside installed PWAs / mobile in-app browsers (it silently
 * returns false there, which is why "Tamamen Sil" did nothing on phones).
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, description, confirmText, danger }
  const resolver = useRef(null);

  const confirm = useCallback((opts) => {
    const options = typeof opts === "string" ? { description: opts } : (opts || {});
    setState({
      title: options.title || "Emin misiniz?",
      description: options.description || "",
      confirmText: options.confirmText || "Onayla",
      cancelText: options.cancelText || "Vazgeç",
      danger: options.danger !== false,
    });
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const close = (result) => {
    setState(null);
    if (resolver.current) { resolver.current(result); resolver.current = null; }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!state} onOpenChange={(v) => { if (!v) close(false); }}>
        <AlertDialogContent className="glass-strong border-white/10 text-white" data-testid="confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">{state?.title}</AlertDialogTitle>
            {state?.description && (
              <AlertDialogDescription className="text-zinc-400">{state.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              type="button"
              onClick={() => close(false)}
              data-testid="confirm-cancel-btn"
              className="rounded-full px-5 py-2.5 bg-white/5 border border-white/15 text-zinc-200 hover:bg-white/10 transition-colors"
            >
              {state?.cancelText}
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              data-testid="confirm-accept-btn"
              className={`rounded-full px-5 py-2.5 font-semibold transition-colors ${
                state?.danger
                  ? "bg-red-500/20 border border-red-500/50 text-red-200 hover:bg-red-500/30"
                  : "btn-primary"
              }`}
            >
              {state?.confirmText}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
