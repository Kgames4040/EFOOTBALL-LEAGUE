import React from "react";
import { youtubeId } from "../lib/video";

// Renders a YouTube embed or a native video player based on the URL.
export function VideoPlayer({ url, className = "" }) {
  if (!url) return null;
  const yt = youtubeId(url);
  if (yt) {
    return (
      <div className={`relative w-full overflow-hidden rounded-xl ${className}`} style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          title="video"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          data-testid="magazine-youtube"
        />
      </div>
    );
  }
  return (
    <video src={url} controls playsInline className={`w-full rounded-xl bg-black ${className}`} data-testid="magazine-video" />
  );
}
