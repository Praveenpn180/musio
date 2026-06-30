-- Clean up any existing tables from previous partial runs
DROP TABLE IF EXISTS public.playlist_tracks, public.playlists, public.recent_tracks, public.favorites, public.saved_tracks, public.profiles, public.tracks CASCADE;

-- 1. Create Tracks Table
CREATE TABLE public.tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  duration TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  thumbnail TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for Tracks
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to tracks" ON public.tracks FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert tracks" ON public.tracks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update tracks" ON public.tracks FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. Create Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Create Saved Tracks Table
CREATE TABLE public.saved_tracks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, track_id)
);

-- Enable RLS for Saved Tracks
ALTER TABLE public.saved_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own saved tracks" ON public.saved_tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own saved tracks" ON public.saved_tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own saved tracks" ON public.saved_tracks FOR DELETE USING (auth.uid() = user_id);

-- 4. Create Favorites Table
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, track_id)
);

-- Enable RLS for Favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- 5. Create Recent Tracks Table
CREATE TABLE public.recent_tracks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, track_id)
);

-- Enable RLS for Recent Tracks
ALTER TABLE public.recent_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own recent tracks" ON public.recent_tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own recent tracks" ON public.recent_tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own recent tracks" ON public.recent_tracks FOR UPDATE USING (auth.uid() = user_id);

-- 6. Create Playlists Table
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for Playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own playlists" ON public.playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own playlists" ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own playlists" ON public.playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own playlists" ON public.playlists FOR DELETE USING (auth.uid() = user_id);

-- 7. Create Playlist Tracks Table
CREATE TABLE public.playlist_tracks (
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);

-- Enable RLS for Playlist Tracks
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own playlist tracks" ON public.playlist_tracks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlists 
    WHERE public.playlists.id = public.playlist_tracks.playlist_id 
    AND public.playlists.user_id = auth.uid()
  )
);
CREATE POLICY "Allow users to insert their own playlist tracks" ON public.playlist_tracks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.playlists 
    WHERE public.playlists.id = playlist_id 
    AND public.playlists.user_id = auth.uid()
  )
);
CREATE POLICY "Allow users to update their own playlist tracks" ON public.playlist_tracks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.playlists 
    WHERE public.playlists.id = playlist_id 
    AND public.playlists.user_id = auth.uid()
  )
);
CREATE POLICY "Allow users to delete their own playlist tracks" ON public.playlist_tracks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.playlists 
    WHERE public.playlists.id = playlist_id 
    AND public.playlists.user_id = auth.uid()
  )
);
