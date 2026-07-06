// Helpers to detect & embed video URLs (YouTube or direct/Cloudinary mp4)
export function youtubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function isVideoUrl(url) {
  return !!url && (!!youtubeId(url) || /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url) || url.includes("/video/upload/"));
}
