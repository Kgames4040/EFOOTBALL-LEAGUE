import React, { useRef, useState } from "react";
import { uploadVideo } from "../lib/api";
import { Loader2, UploadCloud, X } from "lucide-react";

export function VideoUpload({ value, onChange, label = "Video", testid = "video-upload" }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setLoading(true);
    try {
      const url = await uploadVideo(file);
      onChange(url);
    } catch (e) {
      setErr("Video yüklenemedi (büyük dosya olabilir)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="label-xs">{label}</span>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          data-testid={`${testid}-trigger`}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-neon-blue" /> : <UploadCloud className="w-4 h-4" />}
          {value ? "Videoyu Değiştir" : "Video Yükle"}
        </button>
        {value && !loading && (
          <button type="button" onClick={() => onChange("")} className="text-zinc-400 hover:text-red-400 transition-colors" data-testid={`${testid}-clear`}>
            <X className="w-4 h-4" />
          </button>
        )}
        <input ref={inputRef} type="file" accept="video/*" hidden onChange={handleFile} data-testid={`${testid}-input`} />
      </div>
      {value && !loading && <span className="text-[11px] text-neon-green truncate max-w-full">Video yüklendi ✓</span>}
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}
