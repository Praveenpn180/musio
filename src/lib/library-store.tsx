import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { YTTrack } from "./youtube.functions";

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

const KEY = "sonance.library.v1";

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
  saveTrack: (t: Track) => void;
  removeTrack: (id: string) => void;
  toggleFavorite: (t: Track) => void;
  isFavorite: (id: string) => boolean;
  isSaved: (id: string) => boolean;
  pushRecent: (t: Track) => void;
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
};

const LibraryContext = createContext<Ctx | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LibraryState>(empty);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  const ctx: Ctx = {
    state,
    isSaved: (id) => !!state.saved[id],
    isFavorite: (id) => state.favorites.includes(id),
    saveTrack: (t) =>
      setState((s) => ({ ...s, saved: { ...s.saved, [t.id]: t } })),
    removeTrack: (id) =>
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
      }),
    toggleFavorite: (t) =>
      setState((s) => {
        const has = s.favorites.includes(t.id);
        return {
          ...s,
          saved: { ...s.saved, [t.id]: t },
          favorites: has ? s.favorites.filter((f) => f !== t.id) : [t.id, ...s.favorites],
        };
      }),
    pushRecent: (t) =>
      setState((s) => ({
        ...s,
        saved: { ...s.saved, [t.id]: t },
        recent: [t.id, ...s.recent.filter((r) => r !== t.id)].slice(0, 30),
      })),
    createPlaylist: (name) => {
      const p: Playlist = {
        id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        createdAt: Date.now(),
        trackIds: [],
      };
      setState((s) => ({ ...s, playlists: [p, ...s.playlists] }));
      return p;
    },
    deletePlaylist: (id) =>
      setState((s) => ({ ...s, playlists: s.playlists.filter((p) => p.id !== id) })),
    renamePlaylist: (id, name) =>
      setState((s) => ({
        ...s,
        playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
      })),
    addToPlaylist: (playlistId, track) =>
      setState((s) => ({
        ...s,
        saved: { ...s.saved, [track.id]: track },
        playlists: s.playlists.map((p) =>
          p.id === playlistId && !p.trackIds.includes(track.id)
            ? { ...p, trackIds: [...p.trackIds, track.id] }
            : p,
        ),
      })),
    removeFromPlaylist: (playlistId, trackId) =>
      setState((s) => ({
        ...s,
        playlists: s.playlists.map((p) =>
          p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
        ),
      })),
  };

  return <LibraryContext.Provider value={ctx}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}
