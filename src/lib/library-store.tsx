import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { YTTrack } from "./youtube.functions";
import { supabase } from "../integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Track = YTTrack;

export type Playlist = {
  id: string;
  name: string;
  createdAt: number;
  trackIds: string[];
};

type LibraryState = {
  saved: Record<string, Track>;
  favorites: string[];
  recent: string[]; // most recent first
  playlists: Playlist[];
};

const KEY = "musio.library.v1";

const empty: LibraryState = { saved: {}, favorites: [], recent: [], playlists: [] };

function load(): LibraryState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

function save(state: LibraryState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

type Ctx = {
  state: LibraryState;
  user: User | null;
  hydrated: boolean;
  saveTrack: (t: Track) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  toggleFavorite: (t: Track) => Promise<void>;
  isFavorite: (id: string) => boolean;
  isSaved: (id: string) => boolean;
  pushRecent: (t: Track) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
};

const LibraryContext = createContext<Ctx | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LibraryState>(empty);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const loadFromSupabase = async (userId: string) => {
    try {
      // 1. Fetch saved tracks relations
      const { data: savedData, error: savedErr } = await supabase
        .from("saved_tracks")
        .select("track_id");
      if (savedErr) throw savedErr;

      // 2. Fetch favorites
      const { data: favsData, error: favsErr } = await supabase
        .from("favorites")
        .select("track_id");
      if (favsErr) throw favsErr;

      // 3. Fetch recents
      const { data: recsData, error: recsErr } = await supabase
        .from("recent_tracks")
        .select("track_id");
      if (recsErr) throw recsErr;

      // 4. Fetch playlists
      const { data: plsData, error: plsErr } = await supabase
        .from("playlists")
        .select("id, name, created_at, playlist_tracks(track_id, position)");
      if (plsErr) throw plsErr;

      // Gather unique track IDs to pull metadata
      const uniqueTrackIds = new Set<string>();
      savedData?.forEach((x) => x.track_id && uniqueTrackIds.add(x.track_id));
      favsData?.forEach((x) => x.track_id && uniqueTrackIds.add(x.track_id));
      recsData?.forEach((x) => x.track_id && uniqueTrackIds.add(x.track_id));
      plsData?.forEach((pl) => {
        pl.playlist_tracks?.forEach((x) => x.track_id && uniqueTrackIds.add(x.track_id));
      });

      let tracksMap: Record<string, Track> = {};
      if (uniqueTrackIds.size > 0) {
        const { data: tracksData, error: tracksErr } = await supabase
          .from("tracks")
          .select("*")
          .in("id", Array.from(uniqueTrackIds));
        if (tracksErr) throw tracksErr;

        tracksData?.forEach((t) => {
          tracksMap[t.id] = {
            id: t.id,
            title: t.title,
            channel: t.channel,
            duration: t.duration,
            durationSeconds: t.duration_seconds,
            thumbnail: t.thumbnail,
          };
        });
      }

      const localSaved: Record<string, Track> = {};
      savedData?.forEach((x) => {
        if (tracksMap[x.track_id]) {
          localSaved[x.track_id] = tracksMap[x.track_id];
        }
      });

      setState({
        saved: localSaved,
        favorites: favsData?.map((x) => x.track_id).filter((id) => !!tracksMap[id]) ?? [],
        recent: recsData?.map((x) => x.track_id).filter((id) => !!tracksMap[id]) ?? [],
        playlists:
          plsData?.map((pl) => ({
            id: pl.id,
            name: pl.name,
            createdAt: new Date(pl.created_at).getTime(),
            trackIds:
              pl.playlist_tracks
                ?.sort((a, b) => a.position - b.position)
                .map((x) => x.track_id)
                .filter((id) => !!tracksMap[id]) ?? [],
          })) ?? [],
      });
      setHydrated(true);
    } catch (err) {
      console.error("[Supabase Load Error]", err);
    }
  };

  const syncLocalLibraryToSupabase = async (userId: string) => {
    const local = load();
    if (Object.keys(local.saved).length === 0 && local.playlists.length === 0) return;

    try {
      const allTracks = Object.values(local.saved);
      if (allTracks.length > 0) {
        const payload = allTracks.map((t) => ({
          id: t.id,
          title: t.title,
          channel: t.channel,
          duration: t.duration,
          duration_seconds: t.durationSeconds,
          thumbnail: t.thumbnail,
        }));
        await supabase.from("tracks").upsert(payload);

        const savedPayload = allTracks.map((t) => ({
          user_id: userId,
          track_id: t.id,
        }));
        await supabase.from("saved_tracks").upsert(savedPayload);
      }

      if (local.favorites.length > 0) {
        await supabase.from("favorites").upsert(
          local.favorites.map((trackId) => ({
            user_id: userId,
            track_id: trackId,
          })),
        );
      }

      if (local.recent.length > 0) {
        await supabase.from("recent_tracks").upsert(
          local.recent.map((trackId) => ({
            user_id: userId,
            track_id: trackId,
          })),
        );
      }

      for (const pl of local.playlists) {
        const { data: plData, error: plErr } = await supabase
          .from("playlists")
          .insert({ name: pl.name, user_id: userId })
          .select("id")
          .single();

        if (!plErr && plData && pl.trackIds.length > 0) {
          const ptPayload = pl.trackIds.map((trackId, idx) => ({
            playlist_id: plData.id,
            track_id: trackId,
            position: idx,
          }));
          await supabase.from("playlist_tracks").upsert(ptPayload);
        }
      }

      // Sync complete, clean up LocalStorage cache to avoid future loops
      localStorage.removeItem(KEY);
    } catch (err) {
      console.error("[Supabase Sync Error]", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadFromSupabase(u.id);
      } else {
        setState(load());
        setHydrated(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === "SIGNED_IN" && u) {
        await syncLocalLibraryToSupabase(u.id);
        await loadFromSupabase(u.id);
      } else if (event === "SIGNED_OUT") {
        setState(load());
        setHydrated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (hydrated && !user) save(state);
  }, [state, hydrated, user]);

  const ctx: Ctx = {
    state,
    user,
    hydrated,
    isSaved: (id) => !!state.saved[id],
    isFavorite: (id) => state.favorites.includes(id),
    saveTrack: async (t) => {
      setState((s) => ({ ...s, saved: { ...s.saved, [t.id]: t } }));
      if (user) {
        try {
          await supabase.from("tracks").upsert({
            id: t.id,
            title: t.title,
            channel: t.channel,
            duration: t.duration,
            duration_seconds: t.durationSeconds,
            thumbnail: t.thumbnail,
          });
          await supabase.from("saved_tracks").upsert({
            user_id: user.id,
            track_id: t.id,
          });
        } catch (err) {
          console.error("Failed to save track to Supabase:", err);
        }
      }
    },
    removeTrack: async (id) => {
      setState((s) => {
        const saved = { ...s.saved };
        delete saved[id];
        return {
          ...s,
          saved,
          favorites: s.favorites.filter((f) => f !== id),
          recent: s.recent.filter((r) => r !== id),
          playlists: s.playlists.map((p) => ({
            ...p,
            trackIds: p.trackIds.filter((t) => t !== id),
          })),
        };
      });
      if (user) {
        try {
          await supabase.from("saved_tracks").delete().match({ user_id: user.id, track_id: id });
          await supabase.from("favorites").delete().match({ user_id: user.id, track_id: id });
          await supabase.from("recent_tracks").delete().match({ user_id: user.id, track_id: id });
        } catch (err) {
          console.error("Failed to delete track from Supabase:", err);
        }
      }
    },
    toggleFavorite: async (t) => {
      const has = state.favorites.includes(t.id);
      setState((s) => ({
        ...s,
        saved: { ...s.saved, [t.id]: t },
        favorites: has ? s.favorites.filter((f) => f !== t.id) : [t.id, ...s.favorites],
      }));
      if (user) {
        try {
          await supabase.from("tracks").upsert({
            id: t.id,
            title: t.title,
            channel: t.channel,
            duration: t.duration,
            duration_seconds: t.durationSeconds,
            thumbnail: t.thumbnail,
          });
          if (has) {
            await supabase.from("favorites").delete().match({ user_id: user.id, track_id: t.id });
          } else {
            await supabase.from("favorites").upsert({ user_id: user.id, track_id: t.id });
          }
        } catch (err) {
          console.error("Failed to toggle favorite in Supabase:", err);
        }
      }
    },
    pushRecent: async (t) => {
      setState((s) => ({
        ...s,
        saved: { ...s.saved, [t.id]: t },
        recent: [t.id, ...s.recent.filter((r) => r !== t.id)].slice(0, 30),
      }));
      if (user) {
        try {
          await supabase.from("tracks").upsert({
            id: t.id,
            title: t.title,
            channel: t.channel,
            duration: t.duration,
            duration_seconds: t.durationSeconds,
            thumbnail: t.thumbnail,
          });
          await supabase.from("recent_tracks").upsert({
            user_id: user.id,
            track_id: t.id,
            played_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error("Failed to push recent track to Supabase:", err);
        }
      }
    },
    createPlaylist: async (name) => {
      const tempId = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const p: Playlist = {
        id: tempId,
        name,
        createdAt: Date.now(),
        trackIds: [],
      };

      setState((s) => ({ ...s, playlists: [p, ...s.playlists] }));

      if (user) {
        try {
          const { data, error } = await supabase
            .from("playlists")
            .insert({ name, user_id: user.id })
            .select("id")
            .single();

          if (!error && data) {
            setState((s) => ({
              ...s,
              playlists: s.playlists.map((x) => (x.id === tempId ? { ...x, id: data.id } : x)),
            }));
            p.id = data.id;
          }
        } catch (err) {
          console.error("Failed to create playlist in Supabase:", err);
        }
      }
      return p;
    },
    deletePlaylist: async (id) => {
      setState((s) => ({ ...s, playlists: s.playlists.filter((p) => p.id !== id) }));
      if (user) {
        try {
          await supabase.from("playlists").delete().match({ id, user_id: user.id });
        } catch (err) {
          console.error("Failed to delete playlist from Supabase:", err);
        }
      }
    },
    renamePlaylist: async (id, name) => {
      setState((s) => ({
        ...s,
        playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
      }));
      if (user) {
        try {
          await supabase.from("playlists").update({ name }).match({ id, user_id: user.id });
        } catch (err) {
          console.error("Failed to rename playlist in Supabase:", err);
        }
      }
    },
    addToPlaylist: async (playlistId, track) => {
      setState((s) => ({
        ...s,
        saved: { ...s.saved, [track.id]: track },
        playlists: s.playlists.map((p) =>
          p.id === playlistId && !p.trackIds.includes(track.id)
            ? { ...p, trackIds: [...p.trackIds, track.id] }
            : p,
        ),
      }));
      if (user) {
        try {
          await supabase.from("tracks").upsert({
            id: track.id,
            title: track.title,
            channel: track.channel,
            duration: track.duration,
            duration_seconds: track.durationSeconds,
            thumbnail: track.thumbnail,
          });
          const playlist = state.playlists.find((p) => p.id === playlistId);
          const currentCount = playlist?.trackIds.length || 0;
          await supabase.from("playlist_tracks").upsert({
            playlist_id: playlistId,
            track_id: track.id,
            position: currentCount,
          });
        } catch (err) {
          console.error("Failed to add track to playlist in Supabase:", err);
        }
      }
    },
    removeFromPlaylist: async (playlistId, trackId) => {
      setState((s) => ({
        ...s,
        playlists: s.playlists.map((p) =>
          p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
        ),
      }));
      if (user) {
        try {
          await supabase
            .from("playlist_tracks")
            .delete()
            .match({ playlist_id: playlistId, track_id: trackId });
        } catch (err) {
          console.error("Failed to remove track from playlist in Supabase:", err);
        }
      }
    },
  };

  return <LibraryContext.Provider value={ctx}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}
