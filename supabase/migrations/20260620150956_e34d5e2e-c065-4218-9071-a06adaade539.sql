
-- Enable pgvector for semantic search (used in Phase 3)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ video_captions ============
CREATE TABLE public.video_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('rw','en','fr','sw')),
  vtt_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','manual')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (video_id, language)
);
GRANT SELECT ON public.video_captions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_captions TO authenticated;
GRANT ALL ON public.video_captions TO service_role;
ALTER TABLE public.video_captions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Captions readable for public videos"
  ON public.video_captions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_captions.video_id
        AND (v.visibility = 'public' OR v.owner_id = auth.uid())
    )
  );
CREATE POLICY "Owners manage captions"
  ON public.video_captions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_captions.video_id AND v.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_captions.video_id AND v.owner_id = auth.uid())
  );

CREATE TRIGGER trg_video_captions_updated_at
  BEFORE UPDATE ON public.video_captions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ video_ai_metadata ============
CREATE TABLE public.video_ai_metadata (
  video_id UUID PRIMARY KEY REFERENCES public.videos(id) ON DELETE CASCADE,
  summary_short TEXT,
  summary_long TEXT,
  key_takeaways JSONB DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  category_suggested TEXT,
  topic TEXT,
  industry TEXT,
  audience TEXT,
  detected_language TEXT,
  social_posts JSONB DEFAULT '{}'::jsonb,
  transcript_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_ai_metadata TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_ai_metadata TO authenticated;
GRANT ALL ON public.video_ai_metadata TO service_role;
ALTER TABLE public.video_ai_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI metadata readable for public videos"
  ON public.video_ai_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_ai_metadata.video_id
        AND (v.visibility = 'public' OR v.owner_id = auth.uid())
    )
  );
CREATE POLICY "Owners manage AI metadata"
  ON public.video_ai_metadata FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_ai_metadata.video_id AND v.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_ai_metadata.video_id AND v.owner_id = auth.uid())
  );

CREATE TRIGGER trg_video_ai_metadata_updated_at
  BEFORE UPDATE ON public.video_ai_metadata
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ video_embeddings ============
CREATE TABLE public.video_embeddings (
  video_id UUID PRIMARY KEY REFERENCES public.videos(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  model TEXT NOT NULL DEFAULT 'openai/text-embedding-3-small',
  source_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_embeddings TO authenticated;
GRANT ALL ON public.video_embeddings TO service_role;
ALTER TABLE public.video_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage embeddings"
  ON public.video_embeddings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_embeddings.video_id AND v.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_embeddings.video_id AND v.owner_id = auth.uid())
  );

CREATE INDEX video_embeddings_hnsw_idx
  ON public.video_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE TRIGGER trg_video_embeddings_updated_at
  BEFORE UPDATE ON public.video_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ai_jobs ============
CREATE TABLE public.ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('captions','metadata','thumbnails','embedding')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (video_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_jobs TO authenticated;
GRANT ALL ON public.ai_jobs TO service_role;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their AI jobs"
  ON public.ai_jobs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = ai_jobs.video_id AND v.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Owners insert their AI jobs"
  ON public.ai_jobs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = ai_jobs.video_id AND v.owner_id = auth.uid())
  );
CREATE POLICY "Owners update their AI jobs"
  ON public.ai_jobs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = ai_jobs.video_id AND v.owner_id = auth.uid())
  );

CREATE TRIGGER trg_ai_jobs_updated_at
  BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
