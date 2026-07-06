import React, { useRef, useState } from "react";
import { uploadImage } from "../lib/api";
import { Loader2, Upload, X } from "lucide-react";

export function ImageUpload({ value, onChange, label = "Görsel", round = false, testid = "image-upload" }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setLoading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (e) {
      setErr("Yükleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="label-xs">{label}</span>}
      <div className="flex items-center gap-3">
        <div
          onClick={() => inputRef.current?.click()}
          data-testid={`${testid}-trigger`}
          className={`relative cursor-pointer flex items-center justify-center overflow-hidden border border-white/15 bg-white/5 hover:bg-white/10 transition-colors ${
            round ? "w-16 h-16 rounded-full" : "w-20 h-20 rounded-xl"
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-neon-blue" />
          ) : value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-5 h-5 text-zinc-400" />
          )}
        </div>
        {value && !loading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-zinc-400 hover:text-red-400 transition-colors"
            data-testid={`${testid}-clear`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} data-testid={`${testid}-input`} />
      </div>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}
