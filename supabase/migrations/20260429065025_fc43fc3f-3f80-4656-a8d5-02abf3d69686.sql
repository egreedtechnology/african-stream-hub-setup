-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user');
CREATE TYPE public.video_language AS ENUM ('Kinyarwanda', 'Swahili', 'English');
CREATE TYPE public.video_category AS ENUM ('Music', 'Comedy', 'Films', 'Agasobanuye');
CREATE TYPE public.video_visibility AS ENUM ('public', 'unlisted', 'private');
CREATE TYPE public.video_status AS ENUM ('processing', 'ready', 'failed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Roles viewable by self or admin"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ VIDEOS ============
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  language public.video_language NOT NULL DEFAULT 'Kinyarwanda',
  category public.video_category NOT NULL DEFAULT 'Music',
  visibility public.video_visibility NOT NULL DEFAULT 'public',
  status public.video_status NOT NULL DEFAULT 'ready',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_videos_owner ON public.videos(owner_id);
CREATE INDEX idx_videos_created ON public.videos(created_at DESC);

CREATE POLICY "Public videos viewable by everyone"
  ON public.videos FOR SELECT
  USING (visibility = 'public' OR auth.uid() = owner_id);
CREATE POLICY "Owner can insert"
  ON public.videos FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update"
  ON public.videos FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete"
  ON public.videos FOR DELETE USING (auth.uid() = owner_id);

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_comments_video ON public.comments(video_id, created_at DESC);

CREATE POLICY "Comments viewable by everyone"
  ON public.comments FOR SELECT USING (true);
CREATE POLICY "Auth users can insert own comments"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments; owner can delete on their videos"
  ON public.comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.owner_id = auth.uid())
  );

-- ============ VIDEO PROGRESS / PREFS ============
CREATE TABLE public.video_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position_seconds REAL NOT NULL DEFAULT 0,
  muted BOOLEAN NOT NULL DEFAULT false,
  subtitle_lang TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own progress"
  ON public.video_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own progress (insert)"
  ON public.video_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users upsert own progress (update)"
  ON public.video_progress FOR UPDATE USING (auth.uid() = user_id);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_videos_updated BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON public.video_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- mark comments as edited on update of body
CREATE OR REPLACE FUNCTION public.mark_comment_edited()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body THEN NEW.edited = true; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_comments_edited BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.mark_comment_edited();

-- ============ AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('videos', 'videos', true),
  ('thumbnails', 'thumbnails', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for all three buckets
CREATE POLICY "Public read videos"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('videos', 'thumbnails', 'avatars'));

-- Auth users can upload to their own folder (folder name = auth.uid())
CREATE POLICY "Users can upload to own folder (videos)"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('videos', 'thumbnails', 'avatars')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('videos', 'thumbnails', 'avatars')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('videos', 'thumbnails', 'avatars')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );