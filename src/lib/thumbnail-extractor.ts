// Client-side video frame extractor + heuristic scorer.
// Samples N evenly-spaced frames from a video File or URL, computes per-frame
// heuristic scores (sharpness/brightness/colorfulness/edges), returns the top-K
// as JPEG Blobs ready to upload to Supabase storage.

export interface FrameHeuristics {
  sharpness: number;   // luma variance (higher = sharper)
  brightness: number;  // 0..1 mean luma
  colorfulness: number; // rms channel deviation
  edges: number;       // laplacian edge density
  combined: number;    // normalized composite 0..1
}

export interface ExtractedFrame {
  blob: Blob;
  ts: number; // seconds into the video
  heuristics: FrameHeuristics;
}

export interface ExtractOptions {
  samples?: number; // total sample points along timeline
  top?: number;     // keep top-K after heuristic filtering
  width?: number;   // output width (aspect preserved)
  onProgress?: (done: number, total: number) => void;
}

/** Load a video element and wait for metadata. */
function loadVideo(src: string): Promise<HTMLVideoElement> {
  const v = document.createElement('video');
  v.crossOrigin = 'anonymous';
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = src;
  return new Promise((resolve, reject) => {
    const onMeta = () => {
      v.removeEventListener('loadedmetadata', onMeta);
      resolve(v);
    };
    const onErr = () => {
      v.removeEventListener('error', onErr);
      reject(new Error('Could not load video for frame extraction (CORS or codec issue).'));
    };
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('error', onErr);
  });
}

function seek(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeek = () => { v.removeEventListener('seeked', onSeek); resolve(); };
    v.addEventListener('seeked', onSeek);
    const dur = isFinite(v.duration) ? v.duration : 0;
    v.currentTime = Math.min(Math.max(0, t), Math.max(0, dur - 0.05));
  });
}

function analyze(img: ImageData): FrameHeuristics {
  const { data, width, height } = img;
  const stride = 4 * Math.max(1, Math.floor(Math.sqrt(width * height) / 200));
  let sumL = 0, sumR = 0, sumG = 0, sumB = 0, count = 0;
  const lumas: number[] = [];
  for (let i = 0; i < data.length; i += stride) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    sumL += l; sumR += r; sumG += g; sumB += b; count++;
    lumas.push(l);
  }
  const meanL = sumL / count;
  const meanR = sumR / count, meanG = sumG / count, meanB = sumB / count;
  let variance = 0;
  for (const l of lumas) variance += (l - meanL) ** 2;
  variance /= count;
  const rg = meanR - meanG;
  const yb = 0.5 * (meanR + meanG) - meanB;
  const colorfulness = Math.sqrt(rg * rg + yb * yb);
  const brightness = meanL / 255;

  // sparse laplacian edge density
  let edges = 0;
  const cx = width * 4;
  let samples = 0;
  for (let y = 2; y < height - 2; y += 8) {
    for (let x = 2; x < width - 2; x += 8) {
      const i = y * cx + x * 4;
      const c = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const l = data[i - 4] * 0.299 + data[i - 3] * 0.587 + data[i - 2] * 0.114;
      const r = data[i + 4] * 0.299 + data[i + 5] * 0.587 + data[i + 6] * 0.114;
      const u = data[i - cx] * 0.299 + data[i - cx + 1] * 0.587 + data[i - cx + 2] * 0.114;
      const d = data[i + cx] * 0.299 + data[i + cx + 1] * 0.587 + data[i + cx + 2] * 0.114;
      edges += Math.abs(4 * c - l - r - u - d);
      samples++;
    }
  }
  const edgeDensity = samples ? edges / samples : 0;

  const sharpN = Math.min(1, variance / 4000);
  const brightN = 1 - Math.abs(brightness - 0.5) * 2;   // prefer mid brightness
  const colorN = Math.min(1, colorfulness / 80);
  const edgeN = Math.min(1, edgeDensity / 40);
  const combined = 0.4 * sharpN + 0.2 * brightN + 0.2 * colorN + 0.2 * edgeN;

  return { sharpness: variance, brightness, colorfulness, edges: edgeDensity, combined };
}

export async function extractCandidateFrames(
  source: File | string,
  opts: ExtractOptions = {},
): Promise<ExtractedFrame[]> {
  const samples = opts.samples ?? 16;
  const top = opts.top ?? 6;
  const targetW = opts.width ?? 1280;

  const objUrl = typeof source === 'string' ? source : URL.createObjectURL(source);
  const v = await loadVideo(objUrl);
  try {
    const dur = isFinite(v.duration) ? v.duration : 0;
    if (!dur || dur < 0.5) throw new Error('Video too short to extract frames.');
    const vw = v.videoWidth || targetW;
    const vh = v.videoHeight || Math.round(targetW * 9 / 16);
    const w = Math.min(targetW, vw);
    const h = Math.round((vh / vw) * w);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D unavailable');

    const frames: ExtractedFrame[] = [];
    for (let i = 0; i < samples; i++) {
      const t = dur * (0.05 + 0.9 * (i / Math.max(1, samples - 1)));
      try {
        await seek(v, t);
        // small delay for a few frames' worth of decode
        await new Promise((r) => setTimeout(r, 30));
        ctx.drawImage(v, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const heur = analyze(imgData);
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), 'image/jpeg', 0.85),
        );
        if (blob) frames.push({ blob, ts: t, heuristics: heur });
      } catch { /* skip this frame */ }
      opts.onProgress?.(i + 1, samples);
    }

    // Filter out near-black or very flat frames when we have alternatives
    const usable = frames.filter((f) => f.heuristics.brightness > 0.08 && f.heuristics.sharpness > 5);
    const pool = usable.length >= Math.min(3, top) ? usable : frames;
    return pool.sort((a, b) => b.heuristics.combined - a.heuristics.combined).slice(0, top);
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(objUrl);
    v.removeAttribute('src');
    v.load();
  }
}

/**
 * Upload frames to the `thumbnails` bucket at `{ownerId}/{videoId}/frames/…`.
 * Returns the public URLs and metadata that the server-side ranker needs.
 */
export async function uploadFramesForRanking(params: {
  supabase: import('@supabase/supabase-js').SupabaseClient;
  ownerId: string;
  videoId: string;
  frames: ExtractedFrame[];
}): Promise<{ url: string; ts: number; heuristics: FrameHeuristics }[]> {
  const { supabase, ownerId, videoId, frames } = params;
  const results: { url: string; ts: number; heuristics: FrameHeuristics }[] = [];
  const stamp = Date.now();
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const path = `${ownerId}/${videoId}/frames/${stamp}-${i}.jpg`;
    const { error } = await supabase.storage
      .from('thumbnails')
      .upload(path, f.blob, { contentType: 'image/jpeg', upsert: true });
    if (error) continue;
    const { data } = supabase.storage.from('thumbnails').getPublicUrl(path);
    results.push({ url: data.publicUrl, ts: f.ts, heuristics: f.heuristics });
  }
  return results;
}
