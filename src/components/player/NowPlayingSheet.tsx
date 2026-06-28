import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  ChevronDown,
  ListMusic,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { usePlayer, formatTime } from "@/lib/player";
import { useLibrary } from "@/lib/library-store";
import { cn } from "@/lib/utils";

export function NowPlayingSheet() {
  const {
    current,
    playing,
    position,
    duration,
    volume,
    queue,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    removeFromQueue,
    clearQueue,
    showNowPlaying,
    setShowNowPlaying,
  } = usePlayer();
  const { isFavorite, toggleFavorite, playlists, addToPlaylist } = {
    ...useLibrary(),
    playlists: useLibrary().state.playlists,
  };

  const [tab, setTab] = useState<"player" | "queue">("player");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!showNowPlaying) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showNowPlaying]);

  if (!showNowPlaying || !current) return null;
  const fav = isFavorite(current.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom-10 duration-300">
      {/* ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 blur-3xl"
        style={{
          background: `radial-gradient(60% 50% at 50% 30%, color-mix(in oklab, var(--color-brand) 30%, transparent), transparent 70%), url(${current.thumbnail}) center/cover`,
        }}
      />
      <div className="absolute inset-0 -z-10 bg-background/85" aria-hidden />

      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <button
          onClick={() => setShowNowPlaying(false)}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface/70 text-foreground"
          aria-label="Minimize"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Now Playing
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTab(tab === "player" ? "queue" : "player")}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full bg-surface/70",
              tab === "queue" ? "text-brand" : "text-foreground",
            )}
            aria-label="Toggle queue"
          >
            <ListMusic className="h-5 w-5" />
          </button>
        </div>
      </header>

      {tab === "player" ? (
        <div className="flex flex-1 flex-col px-6 pb-8">
          <div className="mx-auto my-4 aspect-square w-full max-w-sm overflow-hidden rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
            <img
              src={current.thumbnail}
              alt={current.title}
              className="h-full w-full object-cover"
              width={512}
              height={512}
            />
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-bold tracking-tight font-display">
                {current.title}
              </h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">{current.channel}</p>
            </div>
            <button
              onClick={() => toggleFavorite(current)}
              aria-label="Toggle favorite"
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface/70",
                fav ? "text-brand" : "text-muted-foreground",
              )}
            >
              <Heart className={cn("h-5 w-5", fav && "fill-brand")} />
            </button>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              aria-label="Add to playlist"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface/70 text-foreground"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {pickerOpen && (
            <div className="mt-3 rounded-2xl border border-border bg-card p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Add to playlist
              </p>
              {playlists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No playlists yet.</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-auto">
                  {playlists.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          addToPlaylist(p.id, current);
                          setPickerOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-surface-hover"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.trackIds.length}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* progress */}
          <div className="mt-6">
            <input
              type="range"
              min={0}
              max={duration || current.durationSeconds || 1}
              step={1}
              value={Math.min(position, duration || current.durationSeconds || 1)}
              onChange={(e) => seek(Number(e.target.value))}
              className="player-range w-full"
              aria-label="Seek"
            />
            <div className="mt-1 flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration || current.durationSeconds)}</span>
            </div>
          </div>

          {/* controls */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              onClick={previous}
              className="grid h-12 w-12 place-items-center rounded-full text-foreground"
              aria-label="Previous"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </button>
            <button
              onClick={togglePlay}
              className="grid h-16 w-16 place-items-center rounded-full bg-brand text-primary-foreground shadow-[0_10px_40px_-5px_var(--color-brand-glow)] transition-transform active:scale-95"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-7 w-7 fill-current" />
              ) : (
                <Play className="h-7 w-7 fill-current ml-1" />
              )}
            </button>
            <button
              onClick={next}
              className="grid h-12 w-12 place-items-center rounded-full text-foreground"
              aria-label="Next"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="player-range w-full"
              aria-label="Volume"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col px-5 pb-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold font-display">Up Next</h3>
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          {queue.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Queue is empty. Add tracks from search or your library.
            </p>
          ) : (
            <ul className="space-y-1 overflow-auto">
              {queue.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-hover"
                >
                  <img src={t.thumbnail} alt="" className="h-10 w-10 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{t.channel}</p>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">{t.duration}</span>
                  <button
                    onClick={() => removeFromQueue(t.id)}
                    aria-label="Remove from queue"
                    className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <style>{`
        .player-range {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: color-mix(in oklab, var(--color-foreground) 12%, transparent);
          border-radius: 999px;
          outline: none;
        }
        .player-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: var(--color-brand);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-brand) 18%, transparent);
          cursor: pointer;
        }
        .player-range::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: var(--color-brand); border: none; cursor: pointer;
        }
      `}</style>
    </div>
  );
}
