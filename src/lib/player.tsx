import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Track } from "./library-store";
import { useLibrary } from "./library-store";
import { getRecommendations } from "./youtube.functions";

const AUTOPLAY_STORAGE_KEY = "musio:autoplay-enabled";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type PlayerCtx = {
  current: Track | null;
  queue: Track[]; // upcoming after current
  history: Track[];
  playing: boolean;
  ready: boolean;
  position: number;
  duration: number;
  volume: number;
  showNowPlaying: boolean;
  setShowNowPlaying: (v: boolean) => void;
  locked: boolean;
  lock: () => void;
  unlock: () => void;
  autoplayEnabled: boolean;
  setAutoplayEnabled: (v: boolean) => void;
  isLoadingAutoplay: boolean;
  playTrack: (t: Track, opts?: { queue?: Track[] }) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  addToQueue: (t: Track) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

let apiPromise: Promise<void> | null = null;
function loadYTApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });
  return apiPromise;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { pushRecent, user } = useLibrary();
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<number | null>(null);

  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [locked, setLocked] = useState(false);
  const [autoplayEnabled, setAutoplayEnabledState] = useState(true);
  const [isLoadingAutoplay, setIsLoadingAutoplay] = useState(false);

  // Refs mirror latest state. The YT.Player event handlers are bound once on
  // mount (see the init effect below), so anything they read must come from a
  // ref rather than a captured state value, or it will be permanently stale.
  const currentRef = useRef<Track | null>(null);
  const historyRef = useRef<Track[]>([]);
  const autoplayRef = useRef(true);
  const getRecsRef = useRef<(args: {
    data: { videoId?: string; title?: string; channel?: string; preferredLanguages?: string[] };
  }) => Promise<Awaited<ReturnType<typeof getRecommendations>>>>(undefined);

  const getRecsFn = useServerFn(getRecommendations);
  useEffect(() => {
    getRecsRef.current = getRecsFn;
  }, [getRecsFn]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    autoplayRef.current = autoplayEnabled;
  }, [autoplayEnabled]);

  // restore the autoplay preference once on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AUTOPLAY_STORAGE_KEY);
      if (saved !== null) setAutoplayEnabledState(saved === "true");
    } catch {}
  }, []);

  const setAutoplayEnabled = useCallback((v: boolean) => {
    setAutoplayEnabledState(v);
    try {
      window.localStorage.setItem(AUTOPLAY_STORAGE_KEY, String(v));
    } catch {}
  }, []);

  const lock = useCallback(() => {
    setLocked(true);
    setShowNowPlaying(false);
  }, []);
  const unlock = useCallback(() => setLocked(false), []);

  // init the iframe player once
  useEffect(() => {
    let cancelled = false;
    loadYTApi().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "1",
        width: "1",
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            setReady(true);
            playerRef.current?.setVolume(volume);
          },
          onStateChange: (e: any) => {
            const YTState = window.YT.PlayerState;
            if (e.data === YTState.PLAYING) setPlaying(true);
            else if (e.data === YTState.PAUSED) setPlaying(false);
            else if (e.data === YTState.ENDED) {
              setPlaying(false);
              advance();
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tick progress
  useEffect(() => {
    if (!playing) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = window.setInterval(() => {
      try {
        const p = playerRef.current?.getCurrentTime?.() ?? 0;
        const d = playerRef.current?.getDuration?.() ?? 0;
        setPosition(p);
        setDuration(d);
      } catch {}
    }, 500);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [playing]);
  const playTrack = useCallback(
    (t: Track, opts?: { queue?: Track[] }) => {
      setCurrent((prev) => {
        if (prev) setHistory((h) => [prev, ...h].slice(0, 50));
        return t;
      });
      if (opts?.queue) setQueue(opts.queue.filter((x) => x.id !== t.id));
      pushRecent(t);
      const start = () => {
        try {
          playerRef.current?.loadVideoById?.(t.id);
          playerRef.current?.setVolume?.(volume);
          playerRef.current?.playVideo?.();
        } catch {}
      };
      if (ready) start();
      else {
        const tryUntilReady = setInterval(() => {
          if (playerRef.current?.loadVideoById) {
            clearInterval(tryUntilReady);
            start();
          }
        }, 200);
        setTimeout(() => clearInterval(tryUntilReady), 8000);
      }
    },
    [pushRecent, ready, volume],
  );

  const togglePlay = useCallback(() => {
    if (!current) return;
    try {
      if (playing) playerRef.current?.pauseVideo?.();
      else playerRef.current?.playVideo?.();
    } catch {}
  }, [current, playing]);

  // Fetches "related" tracks for `basis` and continues playback with them so
  // the queue never has to run dry. Returns true if it found something to play.
  const fetchAndQueueRecommendations = useCallback(
    async (basis: Track) => {
      setIsLoadingAutoplay(true);
      try {
        const preferredLanguages = user?.user_metadata?.preferred_languages;
        const recs = await getRecsRef.current?.({
          data: {
            videoId: basis.id,
            title: basis.title,
            channel: basis.channel,
            preferredLanguages,
          },
        });
        if (!recs || recs.length === 0) return false;

        // avoid immediately replaying anything we've already heard recently
        const heardIds = new Set([basis.id, ...historyRef.current.slice(0, 30).map((t) => t.id)]);
        const fresh = recs.filter((t) => !heardIds.has(t.id));
        const pickFrom = fresh.length > 0 ? fresh : recs.filter((t) => t.id !== basis.id);
        if (pickFrom.length === 0) return false;

        const [next_, ...rest] = pickFrom;
        setHistory((h) => [basis, ...h].slice(0, 50));
        setCurrent(next_);
        setQueue(rest);
        pushRecent(next_);
        try {
          playerRef.current?.loadVideoById?.(next_.id);
          playerRef.current?.playVideo?.();
        } catch {}
        return true;
      } catch (e) {
        console.warn("Autoplay: failed to fetch recommendations", e);
        return false;
      } finally {
        setIsLoadingAutoplay(false);
      }
    },
    [pushRecent, user],
  );

  const advance = useCallback(() => {
    setQueue((q) => {
      if (q.length === 0) {
        const basis = currentRef.current;
        if (autoplayRef.current && basis) {
          // Fire-and-forget: this will set current/queue itself once it resolves.
          // Leave the queue untouched in the meantime instead of stopping playback.
          fetchAndQueueRecommendations(basis).then((found) => {
            if (!found) {
              setCurrent((c) => {
                if (c) setHistory((h) => [c, ...h].slice(0, 50));
                return null;
              });
              try {
                playerRef.current?.stopVideo?.();
              } catch {}
            }
          });
          return q;
        }
        setCurrent((c) => {
          if (c) setHistory((h) => [c, ...h].slice(0, 50));
          return null;
        });
        try {
          playerRef.current?.stopVideo?.();
        } catch {}
        return q;
      }
      const [next_, ...rest] = q;
      setCurrent((c) => {
        if (c) setHistory((h) => [c, ...h].slice(0, 50));
        return next_;
      });
      pushRecent(next_);
      try {
        playerRef.current?.loadVideoById?.(next_.id);
        playerRef.current?.playVideo?.();
      } catch {}
      return rest;
    });
  }, [pushRecent, fetchAndQueueRecommendations]);

  const previous = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) {
        try {
          playerRef.current?.seekTo?.(0, true);
        } catch {}
        return h;
      }
      const [prev, ...rest] = h;
      setCurrent((c) => {
        if (c) setQueue((q) => [c, ...q]);
        return prev;
      });
      pushRecent(prev);
      try {
        playerRef.current?.loadVideoById?.(prev.id);
        playerRef.current?.playVideo?.();
      } catch {}
      return rest;
    });
  }, [pushRecent]);

  const seek = useCallback((sec: number) => {
    try {
      playerRef.current?.seekTo?.(sec, true);
      setPosition(sec);
    } catch {}
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    try {
      playerRef.current?.setVolume?.(v);
    } catch {}
  }, []);

  const addToQueue = useCallback((t: Track) => {
    setQueue((q) => (q.find((x) => x.id === t.id) ? q : [...q, t]));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((q) => q.filter((t) => t.id !== id));
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  // Sync Media Session metadata for lockscreen and background play controls
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    if (current) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: current.title,
        artist: current.channel,
        album: "Musio",
        artwork: [
          {
            src: current.thumbnail,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [current]);

  // Sync Media Session playback state (playing/paused)
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  // Register Media Session hardware/system control action handlers
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler("play", togglePlay);
      navigator.mediaSession.setActionHandler("pause", togglePlay);
      navigator.mediaSession.setActionHandler("nexttrack", advance);
      navigator.mediaSession.setActionHandler("previoustrack", previous);
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    } catch (e) {
      console.warn("Media Session Action Handlers registration failed:", e);
    }

    return () => {
      if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("seekto", null);
      } catch {}
    };
  }, [togglePlay, advance, previous, seek]);

  const value: PlayerCtx = {
    current,
    queue,
    history,
    playing,
    ready,
    position,
    duration,
    volume,
    showNowPlaying,
    setShowNowPlaying,
    locked,
    lock,
    unlock,
    autoplayEnabled,
    setAutoplayEnabled,
    isLoadingAutoplay,
    playTrack,
    togglePlay,
    next: advance,
    previous,
    seek,
    setVolume,
    addToQueue,
    removeFromQueue,
    clearQueue,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Hidden YouTube player (placed in viewport with non-zero opacity to prevent browser throttling/pausing in background tabs) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: 10,
          right: 10,
          width: 200,
          height: 200,
          opacity: 0.001,
          pointerEvents: "none",
          zIndex: -9999,
        }}
      >
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </Ctx.Provider>
  );
}

export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer must be used within PlayerProvider");
  return c;
}

export function formatTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}