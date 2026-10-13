// Cached image helper — wraps thumbnails/avatars through the /img/ proxy
// which sets long-lived immutable CDN cache headers. Falls back to the
// original URL when the host isn't on the allow-list, and to a local
// placeholder cover when no thumbnail exists (e.g. Streamtape imports).

import fallbackCover from "@/assets/thumb-film.jpg";

const PROXY_HOSTS = new Set<string>([
  "buxlzcsvnrouezmsvald.supabase.co",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
]);

export function cdnImage(url: string | null | undefined): string {
  if (!url) return fallbackCover;
  try {
    const u = new URL(url);
    if (u.protocol === "https:" && PROXY_HOSTS.has(u.hostname)) {
      return `/img/${encodeURIComponent(url)}`;
    }
  } catch {
    // fall through
  }
  return url;
}

export { fallbackCover };
