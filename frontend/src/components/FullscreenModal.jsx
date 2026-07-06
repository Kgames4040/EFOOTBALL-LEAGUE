import React from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { X, Maximize2 } from "lucide-react";

// Generic near-fullscreen modal with a title bar and close button (FAZ 1).
export function FullscreenModal({ open, onClose, title, icon: Icon, children, testid = "fullscreen-modal" }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-ink-900 border-white/10 text-white p-0 w-[98vw] sm:max-w-5xl h-[92vh] flex flex-col gap-0 overflow-hidden"
        data-testid={testid}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            {Icon ? <Icon className="w-5 h-5 text-neon-blue" /> : <Maximize2 className="w-5 h-5 text-neon-blue" />}
            {title}
          </DialogTitle>
          <button onClick={onClose} data-testid={`${testid}-close`} className="rounded-full p-1.5 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto thin-scroll p-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
