// Detects whether a video URL should play via native HTML5 <video> or an <iframe> embed,
// and produces a friendly label for unsupported hosts.

export type EmbedKind =
  | { kind: "html5"; src: string }
  | { kind: "iframe"; src: string; provider: string; allow?: string }
  | { kind: "unsupported"; provider: string; originalUrl: string };

const HTML5_EXT = /\.(mp4|m4v|webm|ogg|ogv|mov)(\?.*)?$/i;

/**
 * Convert any known "share/view" URL into a proper embeddable form.
 * Returns null if the URL is not embeddable via iframe.
 */
export function toEmbedUrl(url: string): { src: string; provider: string; allow?: string } | null {
  if (!url) return null;

  // Google Drive — supports /preview embedding
  let m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) return { src: `https://drive.google.com/file/d/${m[1]}/preview`, provider: "Google Drive", allow: "autoplay; encrypted-media; fullscreen" };
  m = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (m) return { src: `https://drive.google.com/file/d/${m[1]}/preview`, provider: "Google Drive", allow: "autoplay; encrypted-media; fullscreen" };
  if (/drive\.google\.com\/.+\/preview/.test(url)) return { src: url, provider: "Google Drive", allow: "autoplay; encrypted-media; fullscreen" };

  // YouTube
  m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (m) return { src: `https://www.youtube.com/embed/${m[1]}`, provider: "YouTube", allow: "autoplay; encrypted-media; picture-in-picture; fullscreen" };

  // Vimeo
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { src: `https://player.vimeo.com/video/${m[1]}`, provider: "Vimeo", allow: "autoplay; fullscreen; picture-in-picture" };

  // Dailymotion
  m = url.match(/dailymotion\.com\/video\/([\w]+)/);
  if (m) return { src: `https://www.dailymotion.com/embed/video/${m[1]}`, provider: "Dailymotion", allow: "autoplay; fullscreen" };

  // Facebook / Fb watch
  if (/facebook\.com\/.+\/videos\/|fb\.watch\//.test(url)) {
    return {
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      provider: "Facebook",
      allow: "autoplay; encrypted-media; picture-in-picture",
    };
  }

  return null;
}

/**
 * Classify a video source: native, embeddable iframe, or unsupported (e.g. MediaFire download page).
 */
export function classifyVideoSource(url: string | undefined | null): EmbedKind {
  if (!url) return { kind: "unsupported", provider: "unknown", originalUrl: "" };

  // Direct file
  if (HTML5_EXT.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return { kind: "html5", src: url };
  }

  const embed = toEmbedUrl(url);
  if (embed) return { kind: "iframe", ...embed };

  // MediaFire and similar file-host share pages — cannot be embedded due to X-Frame-Options.
  if (/mediafire\.com/i.test(url)) return { kind: "unsupported", provider: "MediaFire", originalUrl: url };
  if (/mega\.nz/i.test(url)) return { kind: "unsupported", provider: "MEGA", originalUrl: url };
  if (/dropbox\.com/i.test(url)) {
    // Convert dropbox share to raw if possible
    const raw = url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
    if (HTML5_EXT.test(raw)) return { kind: "html5", src: raw };
    return { kind: "unsupported", provider: "Dropbox", originalUrl: url };
  }

  // Fallback: assume it's a direct media URL — the browser will error if not, and the UI shows the fallback.
  return { kind: "html5", src: url };
}
