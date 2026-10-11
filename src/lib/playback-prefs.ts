// Per-video playback prefs stored in localStorage.
// Keyed by videoId so it works for both signed-in and signed-out users.

export interface PlaybackPrefs {
  position?: number;
  muted?: boolean;
  subtitleLang?: string | null;
  subtitlesOn?: boolean;
}

const KEY = (id: string) => `ibona.pb.${id}`;

export function loadPrefs(videoId: string): PlaybackPrefs {
  try {
    const raw = localStorage.getItem(KEY(videoId));
    return raw ? (JSON.parse(raw) as PlaybackPrefs) : {};
  } catch {
    return {};
  }
}

export function savePrefs(videoId: string, prefs: PlaybackPrefs) {
  try {
    const merged = { ...loadPrefs(videoId), ...prefs };
    localStorage.setItem(KEY(videoId), JSON.stringify(merged));
  } catch {
    /* ignore */
  }
}
