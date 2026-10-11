// Server-only helper for AI providers used by IBONA.
// Never import this file from client code — it relies on server-only env vars.

const GATEWAY = 'https://ai.gateway.lovable.dev/v1';
const ASSEMBLY = 'https://api.assemblyai.com/v2';

function getLovableKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error('LOVABLE_API_KEY is not configured');
  return key;
}

function getAssemblyKey(): string | null {
  return process.env.ASSEMBLYAI_API_KEY ?? null;
}

/** Call /chat/completions with structured JSON output via the Lovable AI Gateway. */
export async function chatJSON<T = unknown>(opts: {
  model?: string;
  system?: string;
  prompt: string;
  schema?: Record<string, unknown>;
}): Promise<T> {
  const model = opts.model ?? 'google/gemini-3-flash-preview';
  const body: Record<string, unknown> = {
    model,
    messages: [
      ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
      { role: 'user', content: opts.prompt },
    ],
    response_format: opts.schema
      ? { type: 'json_schema', json_schema: { name: 'response', strict: true, schema: opts.schema } }
      : { type: 'json_object' },
  };
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': getLovableKey() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI Gateway chat failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(content) as T;
}

/**
 * Multimodal vision scoring: sends N image URLs to Gemini vision and asks it to
 * score each frame across the criteria we care about for thumbnails.
 * Returns per-index scores (0..1) + a short reason.
 */
export interface VisionThumbScore {
  index: number;
  faces: number;
  smiles: number;
  emotions: number;
  motion: number;
  sharpness: number;
  brightness: number;
  text_visibility: number;
  subject_prominence: number;
  overall: number;
  reason: string;
}

export async function scoreThumbnailFrames(opts: {
  imageUrls: string[];
  videoTitle: string;
  category?: string | null;
}): Promise<VisionThumbScore[]> {
  if (opts.imageUrls.length === 0) return [];
  const system =
    'You are a professional YouTube/social video thumbnail selector. Score each candidate frame for its potential as a click-worthy thumbnail. Return valid JSON only.';
  const instructions = `Video title: "${opts.videoTitle}"${
    opts.category ? ` (category: ${opts.category})` : ''
  }.

You will see ${opts.imageUrls.length} candidate frames extracted from the video, in order (index 0 first).
For EACH frame, score these criteria on 0..1 (higher is better):
- faces: are there clear human faces?
- smiles: are subjects smiling / positive expression?
- emotions: is there strong readable emotion / drama?
- motion: does it capture dynamic action?
- sharpness: is it in focus and not blurry?
- brightness: is exposure balanced (not too dark, not blown out)?
- text_visibility: is there visible legible on-screen text/graphics?
- subject_prominence: is the subject large & centered enough to read at small sizes?
- overall: composite thumbnail quality.

Also give a very short "reason" (max 12 words) per frame.

Return JSON exactly like:
{"scores":[{"index":0,"faces":0.9,"smiles":0.7,"emotions":0.6,"motion":0.4,"sharpness":0.8,"brightness":0.7,"text_visibility":0.0,"subject_prominence":0.85,"overall":0.82,"reason":"Clear face, warm lighting, centered subject"}]}`;

  const body = {
    model: 'google/gemini-3-flash-preview',
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: instructions },
          ...opts.imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
        ],
      },
    ],
    response_format: { type: 'json_object' },
  };
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': getLovableKey() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI Gateway vision score failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = j.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as { scores?: VisionThumbScore[] };
  return Array.isArray(parsed.scores) ? parsed.scores : [];
}

/** Small-file fallback transcription via gateway Whisper (sentence-level only). */
export async function transcribeAudio(opts: {
  fileUrl: string;
  filename?: string;
  model?: string;
}): Promise<{ text: string; language?: string }> {
  const model = opts.model ?? 'openai/gpt-4o-mini-transcribe';
  const fileRes = await fetch(opts.fileUrl);
  if (!fileRes.ok) throw new Error(`Failed to fetch media: ${fileRes.status}`);
  const blob = await fileRes.blob();
  if (blob.size > 25 * 1024 * 1024) {
    throw new Error(`Media too large for transcription (${(blob.size / 1024 / 1024).toFixed(1)}MB). 25MB max.`);
  }
  const fd = new FormData();
  fd.append('file', blob, opts.filename ?? 'media');
  fd.append('model', model);
  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Lovable-API-Key': getLovableKey() },
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Transcription failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { text?: string; language?: string };
  return { text: json.text ?? '', language: json.language };
}

export interface AAIWord {
  text: string;
  start: number; // ms
  end: number;   // ms
}

/**
 * Real word-level transcription via AssemblyAI. Returns full text + words with ms timestamps
 * + detected language (ISO 639-1). Handles large media files via remote URL ingestion.
 */
export async function assemblyAITranscribe(opts: {
  audioUrl: string;
}): Promise<{ text: string; words: AAIWord[]; language: string }> {
  const key = getAssemblyKey();
  if (!key) throw new Error('ASSEMBLYAI_API_KEY is not configured');

  // 1. Submit
  const submit = await fetch(`${ASSEMBLY}/transcript`, {
    method: 'POST',
    headers: { authorization: key, 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: opts.audioUrl,
      language_detection: true,
      punctuate: true,
      format_text: true,
      speech_model: 'universal',
    }),
  });
  if (!submit.ok) {
    const t = await submit.text().catch(() => '');
    throw new Error(`AssemblyAI submit failed: ${submit.status} ${t.slice(0, 300)}`);
  }
  const { id } = (await submit.json()) as { id: string };

  // 2. Poll
  const deadline = Date.now() + 1000 * 60 * 10; // 10 minutes max
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    const poll = await fetch(`${ASSEMBLY}/transcript/${id}`, { headers: { authorization: key } });
    if (!poll.ok) continue;
    const data = (await poll.json()) as {
      status: 'queued' | 'processing' | 'completed' | 'error';
      text?: string;
      words?: AAIWord[];
      language_code?: string;
      error?: string;
    };
    if (data.status === 'completed') {
      return {
        text: data.text ?? '',
        words: data.words ?? [],
        language: (data.language_code ?? 'en').slice(0, 2),
      };
    }
    if (data.status === 'error') throw new Error(`AssemblyAI: ${data.error ?? 'transcription error'}`);
  }
  throw new Error('AssemblyAI transcription timed out');
}

/**
 * Generate an image (cover thumbnail) via the Lovable AI Gateway using Gemini image preview.
 * Returns a PNG data URL (base64) so callers can re-upload to Supabase storage.
 */
export async function generateImage(prompt: string): Promise<{ dataUrl: string }> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': getLovableKey() },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`AI Gateway image failed: ${res.status} ${t.slice(0, 300)}`);
  }
  const j = (await res.json()) as {
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
  };
  const url = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error('Gateway returned no image');
  return { dataUrl: url };
}

/** Generate an embedding for arbitrary text. Returns a 768-dim vector by default. */
export async function embedText(text: string): Promise<number[]> {
  // Lovable AI Gateway exposes OpenAI-compatible embeddings endpoint.
  const res = await fetch(`${GATEWAY}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': getLovableKey() },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`AI Gateway embed failed: ${res.status} ${t.slice(0, 300)}`);
  }
  const j = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const emb = j.data?.[0]?.embedding;
  if (!emb || !Array.isArray(emb)) throw new Error('Embedding gateway returned empty vector');
  return emb;
}
