// Small helpers for image URLs. If the URL points to Cloudinary, injects
// on-the-fly transformations (auto format/quality + fill crop) so uploaded
// images always fit the intended container without upload-time processing.

const CLD_UPLOAD = "/image/upload/";

export function optimizeImage(url, opts = {}) {
  if (!url) return "";
  if (typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes(CLD_UPLOAD)) return url;
  const { w, h, crop = "fill", gravity = "auto", extra = "" } = opts;
  const parts = ["f_auto", "q_auto"];
  if (crop) parts.push(`c_${crop}`);
  if (gravity && crop === "fill") parts.push(`g_${gravity}`);
  if (w) parts.push(`w_${w}`);
  if (h) parts.push(`h_${h}`);
  if (extra) parts.push(extra);
  const tx = parts.join(",");
  const idx = url.indexOf(CLD_UPLOAD) + CLD_UPLOAD.length;
  const before = url.slice(0, idx);
  let after = url.slice(idx);
  // If existing segment before /vXXX/ or filename looks like a transformation
  // (contains an underscore + no dot at start), strip it once.
  const firstSlash = after.indexOf("/");
  if (firstSlash > 0) {
    const head = after.slice(0, firstSlash);
    if (/(^|,)(f_|q_|c_|w_|h_|g_|dpr_|e_|ar_)/.test(head)) {
      after = after.slice(firstSlash + 1);
    }
  }
  return before + tx + "/" + after;
}

// Tournament cover: wide banner but never distorted.
export function tournamentCover(url) {
  return optimizeImage(url, { w: 1200, h: 675, crop: "fill", gravity: "auto" });
}

// Small square (logos, avatars)
export function squareThumb(url, size = 128) {
  return optimizeImage(url, { w: size, h: size, crop: "fill", gravity: "auto" });
}
