import React from "react";
import { COIN_ICON_URL } from "../lib/betting";

export function CoinIcon({ size = 20, className = "", spin = false, glow = false }) {
  return (
    <img
      src={COIN_ICON_URL}
      alt="coin"
      width={size}
      height={size}
      className={`inline-block object-contain shrink-0 ${spin ? "animate-[spin_6s_linear_infinite]" : ""} ${glow ? "drop-shadow-[0_0_10px_rgba(0,242,234,0.6)]" : ""} ${className}`}
      style={{ filter: glow ? "drop-shadow(0 0 10px rgba(0,242,234,0.55))" : undefined }}
    />
  );
}

export function CoinAmount({ amount, size = 18, className = "", prefix = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold ${className}`}>
      <CoinIcon size={size} />
      <span>{prefix}{Number(amount || 0).toLocaleString("tr-TR")}</span>
    </span>
  );
}

export default CoinIcon;
