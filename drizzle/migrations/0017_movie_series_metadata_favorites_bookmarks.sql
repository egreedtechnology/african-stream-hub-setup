-- Add movie/series metadata columns to videos
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS original_title text,
  ADD COLUMN IF NOT EXISTS release_year integer,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS director text,
  ADD COLUMN IF NOT EXISTS "cast" text[],
  ADD COLUMN IF NOT EXISTS genres text[],
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS imdb_rating numeric(3,1),
  ADD COLUMN IF NOT EXISTS imdb_id text,
  ADD COLUMN IF NOT EXISTS quality text,
  ADD COLUMN IF NOT EXISTS trailer_url text,
  ADD COLUMN IF NOT EXISTS poster_url text,
  ADD COLUMN IF NOT EXISTS backdrop_url text,
  ADD COLUMN IF NOT EXISTS movie_type text,
  ADD COLUMN IF NOT EXISTS episode_number integer,
  ADD COLUMN IF NOT EXISTS season_number integer,
  ADD COLUMN IF NOT EXISTS series_slug text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_trending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_top_rated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_editors_choice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_agasobanuye boolean NOT NULL DEFAULT false;

-- Slugify helper (only for backfilling existing rows)
CREATE OR REPLACE FUNCTION public.slugify(_text text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(_text,'')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Backfill slugs for existing videos where NULL
UPDATE public.videos
SET slug = public.slugify(title) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS videos_slug_key ON public.videos (slug);
CREATE INDEX IF NOT EXISTS videos_movie_type_idx ON public.videos (movie_type);
CREATE INDEX IF NOT EXISTS videos_release_year_idx ON public.videos (release_year);
CREATE INDEX IF NOT EXISTS videos_country_code_idx ON public.videos (country_code);
CREATE INDEX IF NOT EXISTS videos_genres_gin ON public.videos USING gin (genres);
CREATE INDEX IF NOT EXISTS videos_tags_gin ON public.videos USING gin (tags);
CREATE INDEX IF NOT EXISTS videos_cast_gin ON public.videos USING gin ("cast");

-- Auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION public.videos_autoslug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.title) || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS videos_autoslug_trg ON public.videos;
CREATE TRIGGER videos_autoslug_trg
  BEFORE INSERT OR UPDATE OF title, slug ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.videos_autoslug();

-- Favorites (My List)
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bookmarks (Watch Later)
CREATE TABLE IF NOT EXISTS public.bookmarks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);