import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

// ---- Shared schemas ----
const VideoIdInput = z.object({ videoId: z.string().uuid() });
const LANGS = ['rw', 'en', 'fr', 'sw'] as const;
const LANG_LABEL: Record<(typeof LANGS)[number], string> = {
  rw: 'Kinyarwanda',
  en: 'English',
  fr: 'French',
  sw: 'Swahili',
};
const LANG_TO_FULL: Record<string, 'Kinyarwanda' | 'English' | 'Swahili'> = {
  rw: 'Kinyarwanda',
  en: 'English',
  sw: 'Swahili',
};

// ---- Helpers ----
type SupabaseLike = import('@supabase/supabase-js').SupabaseClient;
function getSupabaseFromContext(ctx: { supabase: unknown }): SupabaseLike {
  return ctx.supabase as never as SupabaseLike;
}

async function ensureOwner(supabase: SupabaseLike, userId: string, videoId: string) {
  const { data, error } = await supabase
    .from('videos')
    .select('id, owner_id, title, description, video_url, duration_seconds, language, category, media_type, tags, country, keywords')
    .eq('id', videoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Video not found');
  if (data.owner_id !== userId) throw new Error('Forbidden');
  return data;
}

async function upsertJob(
  supabase: SupabaseLike,
  videoId: string,
  kind: 'captions' | 'metadata' | 'thumbnails' | 'embedding',
  status: 'pending' | 'running' | 'done' | 'failed',
  error?: string,
) {
  const patch: Record<string, unknown> = { video_id: videoId, kind, status };
  if (status === 'running') patch.started_at = new Date().toISOString();
  if (status === 'done' || status === 'failed') patch.finished_at = new Date().toISOString();
  if (error) patch.error = error.slice(0, 500);
  await supabase.from('ai_jobs').upsert(patch, { onConflict: 'video_id,kind' });
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/** Builds a real word-timed VTT, grouping words into 5–8 word cues capped at ~3 seconds. */
function buildVTTFromWords(words: Array<{ text: string; start: number; end: number }>): string {
  if (!words.length) return 'WEBVTT\n\n';
  const cues: string[] = ['WEBVTT', ''];
  let i = 0;
  let cueNum = 1;
  while (i < words.length) {
    const chunkStart = words[i].start / 1000;
    let j = i;
    let charBudget = 0;
    while (
      j < words.length &&
      j - i < 9 &&
      words[j].end / 1000 - chunkStart < 3.2 &&
      charBudget < 64
    ) {
      charBudget += words[j].text.length + 1;
      j++;
      if (/[.!?]$/.test(words[j - 1]?.text ?? '')) break;
    }
    const slice = words.slice(i, j);
    const text = slice.map((w) => w.text).join(' ').replace(/\s+([,.!?])/g, '$1');
    const start = slice[0].start / 1000;
    const end = slice[slice.length - 1].end / 1000;
    cues.push(String(cueNum++));
    cues.push(`${fmtTime(start)} --> ${fmtTime(end)}`);
    cues.push(text);
    cues.push('');
    i = j;
  }
  return cues.join('\n');
}

/** Naïve sentence-level VTT for translated tracks (only the source has word timestamps). */
function buildVTTFromSentences(text: string, totalSec: number, anchors: number[]): string {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  if (!sentences.length) return 'WEBVTT\n\n';
  const cues: string[] = ['WEBVTT', ''];
  // Distribute sentences across the same time spans as the source (proportional)
  const dur = totalSec > 0 ? totalSec : Math.max(sentences.length * 3, 10);
  const step = dur / sentences.length;
  for (let i = 0; i < sentences.length; i++) {
    const start = anchors[i] ?? i * step;
    const end = anchors[i + 1] ?? (i + 1) * step;
    cues.push(String(i + 1));
    cues.push(`${fmtTime(start)} --> ${fmtTime(Math.max(start + 1.2, end))}`);
    cues.push(sentences[i]);
    cues.push('');
  }
  return cues.join('\n');
}

// =========================================================================
// transcribeVideo — REAL word-level captions via AssemblyAI + translations
// =========================================================================
export const transcribeVideo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VideoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = getSupabaseFromContext(context);
    const userId = (context as { userId: string }).userId;
    const video = await ensureOwner(supabase, userId, data.videoId);

    await upsertJob(supabase, data.videoId, 'captions', 'running');
    try {
      const { assemblyAITranscribe, transcribeAudio, chatJSON } = await import('./ai-gateway.server');

      // Try AssemblyAI first for word-level timing; fall back to gateway whisper.
      let transcript = '';
      let words: Array<{ text: string; start: number; end: number }> = [];
      let detected = 'en';
      try {
        const r = await assemblyAITranscribe({ audioUrl: video.video_url });
        transcript = r.text;
        words = r.words;
        detected = r.language || 'en';
      } catch (primaryErr) {
        const r = await transcribeAudio({ fileUrl: video.video_url, filename: `media-${data.videoId}` });
        transcript = r.text;
        detected = (r.language ?? 'en').slice(0, 2);
        if (!transcript) throw primaryErr;
      }
      if (!transcript || transcript.trim().length < 5) {
        throw new Error('No speech detected in this video.');
      }

      const sourceLang = (LANGS as readonly string[]).includes(detected)
        ? (detected as (typeof LANGS)[number])
        : 'en';
      const targets = LANGS.filter((l) => l !== sourceLang);

      // Build sentence-anchor times from word-level data (where sentences end)
      const sentenceAnchors: number[] = [0];
      if (words.length) {
        for (const w of words) {
          if (/[.!?]$/.test(w.text)) sentenceAnchors.push(w.end / 1000);
        }
      }

      // Translate transcript to the other languages
      let translations: Record<string, string> = { [sourceLang]: transcript };
      try {
        const translated = await chatJSON<{ translations: Record<string, string> }>({
          system: 'You are a precise translator. Preserve sentence boundaries and order exactly. Return JSON only.',
          prompt: `Translate the transcript from ${LANG_LABEL[sourceLang]} into each of: ${targets.map((l) => LANG_LABEL[l]).join(', ')}. Same sentence count and order. Natural, fluent. Return shape: {"translations": { "${targets.join('": string, "')}": string }}\n\nTranscript:\n"""${transcript}"""`,
        });
        translations = { ...translations, ...(translated.translations ?? {}) };
      } catch { /* translations are best-effort */ }

      // Upload all 4 VTTs
      const duration = video.duration_seconds || 0;
      for (const lang of LANGS) {
        const vtt =
          lang === sourceLang && words.length
            ? buildVTTFromWords(words)
            : buildVTTFromSentences(translations[lang] ?? transcript, duration, sentenceAnchors);
        const path = `${userId}/${data.videoId}.${lang}.vtt`;
        const blob = new Blob([vtt], { type: 'text/vtt' });
        const { error: upErr } = await supabase.storage
          .from('captions')
          .upload(path, blob, { contentType: 'text/vtt', upsert: true });
        if (upErr) throw new Error(`Caption upload failed: ${upErr.message}`);
        const { data: pub } = supabase.storage.from('captions').getPublicUrl(path);
        await supabase
          .from('video_captions')
          .upsert(
            {
              video_id: data.videoId,
              language: lang,
              vtt_url: pub.publicUrl,
              source: 'ai',
              is_default: lang === sourceLang,
            },
            { onConflict: 'video_id,language' },
          );
      }

      // Stash transcript + detected language for metadata step
      await supabase
        .from('video_ai_metadata')
        .upsert({ video_id: data.videoId, transcript_text: transcript, detected_language: sourceLang }, { onConflict: 'video_id' });

      // If video.language was unset or wrong, align to detected language
      const full = LANG_TO_FULL[sourceLang];
      if (full && full !== video.language) {
        await supabase.from('videos').update({ language: full }).eq('id', data.videoId);
      }

      await upsertJob(supabase, data.videoId, 'captions', 'done');
      return { ok: true, languages: LANGS, detected: sourceLang, wordTimed: words.length > 0 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transcription failed';
      await upsertJob(supabase, data.videoId, 'captions', 'failed', msg);
      return { ok: false, error: msg };
    }
  });

// =========================================================================
// generateVideoMetadata — SEO + auto-apply tags/keywords/country to videos
// Triggers embedding right after so search/For-You see the new content.
// =========================================================================
export const generateVideoMetadata = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VideoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = getSupabaseFromContext(context);
    const userId = (context as { userId: string }).userId;
    const video = await ensureOwner(supabase, userId, data.videoId);

    await upsertJob(supabase, data.videoId, 'metadata', 'running');
    try {
      const { chatJSON } = await import('./ai-gateway.server');
      const { data: meta } = await supabase
        .from('video_ai_metadata')
        .select('transcript_text')
        .eq('video_id', data.videoId)
        .maybeSingle();
      const source =
        (meta?.transcript_text as string | null)?.slice(0, 8000) ??
        `Title: ${video.title}\nDescription: ${video.description ?? ''}\nCategory: ${video.category}\nLanguage: ${video.language}`;

      const schema = {
        type: 'object',
        additionalProperties: false,
        required: ['seo_title','seo_description','summary_short','summary_long','key_takeaways','tags','hashtags','category_suggested','topic','industry','audience','social_posts','keywords','chapters'],
        properties: {
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
          summary_short: { type: 'string' },
          summary_long: { type: 'string' },
          key_takeaways: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
          hashtags: { type: 'array', items: { type: 'string' } },
          keywords: { type: 'array', items: { type: 'string' } },
          category_suggested: { type: 'string' },
          topic: { type: 'string' },
          industry: { type: 'string' },
          audience: { type: 'string' },
          chapters: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'start_seconds'],
              properties: {
                title: { type: 'string' },
                start_seconds: { type: 'number' },
              },
            },
          },
          social_posts: {
            type: 'object',
            additionalProperties: false,
            required: ['x','facebook','linkedin'],
            properties: {
              x: { type: 'string' },
              facebook: { type: 'string' },
              linkedin: { type: 'string' },
            },
          },
        },
      };

      const duration = video.duration_seconds || 0;
      const result = await chatJSON<Record<string, unknown>>({
        system:
          'You are an expert African-content SEO assistant for IBONA (formerly Rebalive) — a Rwanda/East-Africa-first video platform on rebalive.egreedtech.org. Optimize for Kinyarwanda, English, French, and Swahili discovery. Always include Kinyarwanda-relevant SEO keywords (e.g. agasobanuye, film nyarwanda, amakuru, news shorts, best Rwandan movie) when remotely relevant. Return JSON only matching the provided schema.',
        prompt: `Generate SEO metadata for this video.\n\nOriginal title: ${video.title}\nOriginal description: ${video.description ?? '(none)'}\nDeclared category: ${video.category}\nDeclared language: ${video.language}\nDuration: ${duration}s\n\nContent source:\n"""${source}"""\n\nRules:\n- seo_title: <60 chars, punchy, includes top keyword\n- seo_description: <160 chars\n- summary_short: 1-2 sentences\n- summary_long: 3-5 sentences\n- key_takeaways: 3-6 bullets\n- tags: 6-12 lowercase, no #\n- hashtags: 4-8 with #\n- keywords: 8-15 SEO keywords mixing Kinyarwanda + English (must include agasobanuye/film nyarwanda/amakuru if the content fits)\n- category_suggested: one of Music | Comedy | Films | Agasobanuye | Education | Agriculture | Business | Technology | News | Sports\n- chapters: 3-8 chapter markers with start_seconds within [0, ${duration || 'duration'}], evenly covering the video, titles under 60 chars. Return empty array if duration is unknown or too short (< 90s).\n- social_posts.x: <280 chars with 1-3 hashtags\n- social_posts.facebook: 2-3 sentences\n- social_posts.linkedin: professional 3-4 sentences`,
        schema,
      });

      // Persist SEO metadata
      await supabase
        .from('video_ai_metadata')
        .upsert(
          {
            video_id: data.videoId,
            seo_title: result.seo_title as string,
            seo_description: result.seo_description as string,
            summary_short: result.summary_short as string,
            summary_long: result.summary_long as string,
            key_takeaways: result.key_takeaways,
            tags: result.tags,
            hashtags: result.hashtags,
            category_suggested: result.category_suggested as string,
            topic: result.topic as string,
            industry: result.industry as string,
            audience: result.audience as string,
            social_posts: result.social_posts,
            chapters: Array.isArray(result.chapters) ? result.chapters : [],
          },
          { onConflict: 'video_id' },
        );

      // Auto-apply tags + keywords to the videos table so search & SEO benefit immediately.
      // Title/description are left alone unless empty — owner explicitly applies via Studio button.
      const tagsArr = Array.isArray(result.tags) ? (result.tags as string[]) : [];
      const keywordsArr = Array.isArray(result.keywords) ? (result.keywords as string[]) : [];
      const keywords = [...new Set([...tagsArr, ...keywordsArr])].join(', ').slice(0, 1000);
      const patch: Record<string, unknown> = { tags: tagsArr.slice(0, 24), keywords };
      // Default country to RW for our African-first platform (creators can override later)
      if (!video.country) patch.country = 'RW';
      await supabase.from('videos').update(patch).eq('id', data.videoId);

      await upsertJob(supabase, data.videoId, 'metadata', 'done');

      // Fire-and-forget: refresh embedding + moderation so search & safety flags stay fresh
      embedVideoInline(supabase, userId, data.videoId).catch(() => {});
      moderateVideoInline(supabase, userId, data.videoId).catch(() => {});

      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Metadata generation failed';
      await upsertJob(supabase, data.videoId, 'metadata', 'failed', msg);
      return { ok: false, error: msg };
    }
  });

// =========================================================================
// embedVideoInline — internal helper
// =========================================================================
async function embedVideoInline(supabase: SupabaseLike, userId: string, videoId: string) {
  const { embedText } = await import('./ai-gateway.server');
  const { data: v } = await supabase
    .from('videos')
    .select('owner_id, title, description, language, category, tags, keywords')
    .eq('id', videoId)
    .maybeSingle();
  if (!v || (v as { owner_id: string }).owner_id !== userId) return;
  const { data: m } = await supabase
    .from('video_ai_metadata')
    .select('summary_long, summary_short, tags, hashtags')
    .eq('video_id', videoId)
    .maybeSingle();
  const vv = v as { title: string; description: string | null; language: string; category: string; tags: string[] | null; keywords: string | null };
  const mm = m as { summary_long: string | null; summary_short: string | null; tags: string[] | null; hashtags: string[] | null } | null;
  const text = [
    vv.title,
    vv.description ?? '',
    vv.language,
    vv.category,
    (vv.tags ?? []).join(', '),
    vv.keywords ?? '',
    mm?.summary_long ?? mm?.summary_short ?? '',
    (mm?.tags ?? []).join(', '),
    (mm?.hashtags ?? []).join(' '),
  ]
    .filter(Boolean)
    .join('\n');

  await upsertJob(supabase, videoId, 'embedding', 'running');
  try {
    const vec = await embedText(text);
    // pgvector expects string form '[v1,v2,...]'
    const literal = `[${vec.join(',')}]`;
    await supabase
      .from('video_embeddings')
      .upsert(
        { video_id: videoId, embedding: literal, model: 'openai/text-embedding-3-small', source_text: text.slice(0, 4000) },
        { onConflict: 'video_id' },
      );
    await upsertJob(supabase, videoId, 'embedding', 'done');
  } catch (e) {
    await upsertJob(supabase, videoId, 'embedding', 'failed', e instanceof Error ? e.message : 'Embed failed');
  }
}

// Internal moderation helper reused by the metadata pipeline.
async function moderateVideoInline(supabase: SupabaseLike, userId: string, videoId: string) {
  const { data: v } = await supabase
    .from('videos')
    .select('owner_id, title, description, language, category')
    .eq('id', videoId)
    .maybeSingle();
  if (!v || (v as { owner_id: string }).owner_id !== userId) return;
  const vv = v as { title: string; description: string | null; language: string; category: string };
  await upsertJob(supabase, videoId, 'moderation' as never, 'running');
  try {
    const { chatJSON } = await import('./ai-gateway.server');
    const { data: meta } = await supabase
      .from('video_ai_metadata')
      .select('transcript_text, summary_long')
      .eq('video_id', videoId)
      .maybeSingle();
    const mm = meta as { transcript_text: string | null; summary_long: string | null } | null;
    const source =
      mm?.transcript_text?.slice(0, 8000) ?? mm?.summary_long ?? `${vv.title}\n${vv.description ?? ''}`;
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'categories', 'notes'],
      properties: {
        status: { type: 'string', enum: ['safe', 'review', 'blocked'] },
        categories: {
          type: 'object',
          additionalProperties: false,
          required: ['violence','nudity','hate_speech','spam','graphic','copyright'],
          properties: {
            violence: { type: 'number' }, nudity: { type: 'number' }, hate_speech: { type: 'number' },
            spam: { type: 'number' }, graphic: { type: 'number' }, copyright: { type: 'number' },
          },
        },
        notes: { type: 'string' },
      },
    };
    const result = await chatJSON<{ status: string; categories: Record<string, number>; notes: string }>({
      system:
        'You are a content-safety reviewer for IBONA. Score 0..1 per category. status=safe if all <0.3, review if any 0.3–0.7, blocked if any >0.7 for violence/nudity/hate/graphic or clear copyright/spam. Return JSON only.',
      prompt: `Title: ${vv.title}\nDescription: ${vv.description ?? ''}\nCategory: ${vv.category}\nLanguage: ${vv.language}\n\nContent:\n"""${source}"""`,
      schema,
    });
    await supabase
      .from('video_ai_metadata')
      .upsert(
        { video_id: videoId, moderation: { categories: result.categories, notes: result.notes }, moderation_status: result.status },
        { onConflict: 'video_id' },
      );
    await upsertJob(supabase, videoId, 'moderation' as never, 'done');
  } catch (e) {
    await upsertJob(supabase, videoId, 'moderation' as never, 'failed', e instanceof Error ? e.message : 'Moderation failed');
  }
}

export const embedVideo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VideoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = getSupabaseFromContext(context);
    const userId = (context as { userId: string }).userId;
    await ensureOwner(supabase, userId, data.videoId);
    await embedVideoInline(supabase, userId, data.videoId);
    return { ok: true };
  });

// =========================================================================
// generateThumbnails — rank pre-extracted video frames with Gemini vision.
// Frames must be extracted client-side (browser cannot run ffmpeg in the
// Cloudflare Worker runtime) and uploaded to the `thumbnails` bucket first,
// then their URLs + heuristic scores are passed here for AI ranking.
// =========================================================================
const FrameInput = z.object({
  url: z.string().url(),
  ts: z.number().nonnegative(),
  heuristics: z
    .object({
      sharpness: z.number(),
      brightness: z.number(),
      colorfulness: z.number(),
      edges: z.number(),
      combined: z.number(),
    })
    .partial()
    .optional(),
});

export const generateThumbnails = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        videoId: z.string().uuid(),
        frames: z.array(FrameInput).min(1).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = getSupabaseFromContext(context);
    const userId = (context as { userId: string }).userId;
    const video = await ensureOwner(supabase, userId, data.videoId);
    await upsertJob(supabase, data.videoId, 'thumbnails', 'running');
    await supabase
      .from('videos')
      .update({ thumbnail_generation_status: 'running' })
      .eq('id', data.videoId);

    try {
      const { scoreThumbnailFrames } = await import('./ai-gateway.server');

      // Ask Gemini vision to score each frame on the criteria.
      let visionScores: Awaited<ReturnType<typeof scoreThumbnailFrames>> = [];
      try {
        visionScores = await scoreThumbnailFrames({
          imageUrls: data.frames.map((f) => f.url),
          videoTitle: video.title,
          category: video.category,
        });
      } catch {
        // If vision scoring fails we still keep heuristic ordering.
      }

      // Merge AI + client heuristics into a final composite score.
      type Row = {
        url: string;
        ts: number;
        heur: number;
        ai: import('./ai-gateway.server').VisionThumbScore | undefined;
        final: number;
      };
      const rows: Row[] = data.frames.map((f, i) => {
        const heur = f.heuristics?.combined ?? 0.5;
        const ai = visionScores.find((s) => s.index === i);
        const aiOverall = ai?.overall ?? 0.5;
        const final = 0.65 * aiOverall + 0.35 * heur;
        return { url: f.url, ts: f.ts, heur, ai, final };
      });
      rows.sort((a, b) => b.final - a.final);

      // Keep top 5, delete previous AI/frame candidates.
      const keep = rows.slice(0, 5);
      await supabase
        .from('thumbnail_candidates')
        .delete()
        .eq('video_id', data.videoId)
        .in('source', ['ai', 'frame']);

      // Insert new candidates.
      const inserts = keep.map((r, i) => ({
        video_id: data.videoId,
        owner_id: userId,
        url: r.url,
        source: 'ai',
        position: i,
        selected: i === 0,
        score: r.final,
        score_breakdown: r.ai
          ? {
              faces: r.ai.faces,
              smiles: r.ai.smiles,
              emotions: r.ai.emotions,
              motion: r.ai.motion,
              sharpness: r.ai.sharpness,
              brightness: r.ai.brightness,
              text_visibility: r.ai.text_visibility,
              subject_prominence: r.ai.subject_prominence,
              overall: r.ai.overall,
              heuristic: r.heur,
            }
          : { heuristic: r.heur },
        reason: r.ai?.reason ?? null,
        timestamp_seconds: r.ts,
      }));
      if (inserts.length > 0) {
        await supabase.from('thumbnail_candidates').insert(inserts);
      }

      // Update the video with the winner, unless the creator already picked
      // a custom thumbnail themselves.
      const best = keep[0];
      const { data: cur } = await supabase
        .from('videos')
        .select('thumbnail_url')
        .eq('id', data.videoId)
        .maybeSingle();
      const hasCustom = !!cur?.thumbnail_url && cur.thumbnail_url.includes('/custom-');
      const patch: Record<string, unknown> = {
        ai_thumbnail_url: best?.url ?? null,
        thumbnail_options: keep.map((r) => r.url),
        thumbnail_generated_at: new Date().toISOString(),
        thumbnail_generation_status: best ? 'done' : 'failed',
      };
      if (best && !hasCustom) patch.thumbnail_url = best.url;
      await supabase.from('videos').update(patch).eq('id', data.videoId);

      await upsertJob(
        supabase,
        data.videoId,
        'thumbnails',
        best ? 'done' : 'failed',
        best ? undefined : 'No frames survived scoring',
      );
      return { ok: !!best, urls: keep.map((r) => r.url), scores: keep.map((r) => r.final) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Thumbnail ranking failed';
      await upsertJob(supabase, data.videoId, 'thumbnails', 'failed', msg);
      await supabase
        .from('videos')
        .update({ thumbnail_generation_status: 'failed' })
        .eq('id', data.videoId);
      return { ok: false, error: msg };
    }
  });

// =========================================================================
// selectThumbnail — set the chosen candidate URL as the video's thumbnail
// =========================================================================
export const selectThumbnail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid(), url: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = getSupabaseFromContext(context);
    const userId = (context as { userId: string }).userId;
    await ensureOwner(supabase, userId, data.videoId);
    await supabase
      .from('thumbnail_candidates')
      .update({ selected: false })
      .eq('video_id', data.videoId);
    await supabase
      .from('thumbnail_candidates')
      .update({ selected: true })
      .eq('video_id', data.videoId)
      .eq('url', data.url);
    await supabase.from('videos').update({ thumbnail_url: data.url }).eq('id', data.videoId);
    return { ok: true };
  });

// =========================================================================
// markPipelinePending — flag jobs as pending so the UI shows progress immediately
// =========================================================================
export const markPipelinePending = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VideoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = getSupabaseFromContext(context);
    const userId = (context as { userId: string }).userId;
    await ensureOwner(supabase, userId, data.videoId);
    await upsertJob(supabase, data.videoId, 'captions', 'pending');
    await upsertJob(supabase, data.videoId, 'metadata', 'pending');
    await upsertJob(supabase, data.videoId, 'thumbnails', 'pending');
    await upsertJob(supabase, data.videoId, 'embedding', 'pending');
    return { ok: true };
  });

// =========================================================================
// getAiStatus — poll job statuses + metadata + thumbnail candidates
// =========================================================================
export const getAiStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VideoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = getSupabaseFromContext(context);
    const [{ data: jobs }, { data: meta }, { data: caps }, { data: thumbs }] = await Promise.all([
      supabase.from('ai_jobs').select('kind, status, error, updated_at').eq('video_id', data.videoId),
      supabase.from('video_ai_metadata').select('*').eq('video_id', data.videoId).maybeSingle(),
      supabase.from('video_captions').select('language, vtt_url, is_default').eq('video_id', data.videoId),
      supabase
        .from('thumbnail_candidates')
        .select('id, url, source, position, selected, score, score_breakdown, reason, timestamp_seconds, created_at')
        .eq('video_id', data.videoId)
        .order('score', { ascending: false }),
    ]);
    return { jobs: jobs ?? [], metadata: meta ?? null, captions: caps ?? [], thumbnails: thumbs ?? [] };
  });

// =========================================================================
// moderateVideo — Gemini-driven content moderation over transcript + metadata
// Categories: violence, nudity, hate speech, spam, graphic content, copyright.
// Sets moderation_status to 'safe' | 'review' | 'blocked' for reviewer triage.
// Never blocks playback on its own — creators/admins act on the flag.
// =========================================================================
export const moderateVideo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VideoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = getSupabaseFromContext(context);
    const userId = (context as { userId: string }).userId;
    const video = await ensureOwner(supabase, userId, data.videoId);
    await upsertJob(supabase, data.videoId, 'moderation' as never, 'running');
    try {
      const { chatJSON } = await import('./ai-gateway.server');
      const { data: meta } = await supabase
        .from('video_ai_metadata')
        .select('transcript_text, summary_long')
        .eq('video_id', data.videoId)
        .maybeSingle();
      const source =
        (meta?.transcript_text as string | null)?.slice(0, 8000) ??
        (meta?.summary_long as string | null) ??
        `${video.title}\n${video.description ?? ''}`;

      const schema = {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'categories', 'notes'],
        properties: {
          status: { type: 'string', enum: ['safe', 'review', 'blocked'] },
          categories: {
            type: 'object',
            additionalProperties: false,
            required: ['violence','nudity','hate_speech','spam','graphic','copyright'],
            properties: {
              violence: { type: 'number' },
              nudity: { type: 'number' },
              hate_speech: { type: 'number' },
              spam: { type: 'number' },
              graphic: { type: 'number' },
              copyright: { type: 'number' },
            },
          },
          notes: { type: 'string' },
        },
      };

      const result = await chatJSON<{
        status: 'safe' | 'review' | 'blocked';
        categories: Record<string, number>;
        notes: string;
      }>({
        system:
          'You are a content-safety reviewer for IBONA, an African video platform. Score risk 0..1 per category. Use status=safe when all <0.3, review when any 0.3–0.7, blocked when any >0.7 for violence/nudity/hate/graphic or spam/copyright is clear. Return JSON only.',
        prompt: `Title: ${video.title}\nDescription: ${video.description ?? ''}\nCategory: ${video.category}\nLanguage: ${video.language}\n\nContent (transcript or summary):\n"""${source}"""`,
        schema,
      });

      await supabase
        .from('video_ai_metadata')
        .upsert(
          {
            video_id: data.videoId,
            moderation: { categories: result.categories, notes: result.notes },
            moderation_status: result.status,
          },
          { onConflict: 'video_id' },
        );

      await upsertJob(supabase, data.videoId, 'moderation' as never, 'done');
      return { ok: true, status: result.status, categories: result.categories };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Moderation failed';
      await upsertJob(supabase, data.videoId, 'moderation' as never, 'failed', msg);
      return { ok: false, error: msg };
    }
  });
