import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  ChevronDown,
  Plus,
  Trash2,
  Volume2,
  Loader2,
  Lock,
  Infinity as InfinityIcon,
} from "lucide-react";
import { usePlayer, formatTime } from "@/lib/player";
import { useLibrary } from "@/lib/library-store";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { getRecommendations, type YTTrack } from "@/lib/youtube.functions";
import { toast } from "sonner";

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
    playTrack,
    addToQueue,
    lock,
    autoplayEnabled,
    setAutoplayEnabled,
    isLoadingAutoplay,
  } = usePlayer();
  const { isFavorite, toggleFavorite, playlists, addToPlaylist } = {
    ...useLibrary(),
    playlists: useLibrary().state.playlists,
  };

  const [tab, setTab] = useState<"player" | "queue" | "recommended">("player");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recommended, setRecommended] = useState<YTTrack[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const getRecsFn = useServerFn(getRecommendations);

  useEffect(() => {
    if (!current) return;
    let active = true;
    setLoadingRecs(true);
    getRecsFn({ data: { videoId: current.id, title: current.title, channel: current.channel } })
      .then((res) => {
        if (active) setRecommended(res);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (active) setLoadingRecs(false);
      });
    return () => {
      active = false;
    };
  }, [current, getRecsFn]);

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
        <div className="flex rounded-full bg-surface/50 p-1">
          <button
            onClick={() => setTab("player")}
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer",
              tab === "player" ? "bg-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Player
          </button>
          <button
            onClick={() => setTab("queue")}
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer",
              tab === "queue" ? "bg-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Queue ({queue.length})
          </button>
          <button
            onClick={() => setTab("recommended")}
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer",
              tab === "recommended" ? "bg-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Recommended
          </button>
        </div>
        <button
          onClick={lock}
          aria-label="Enter lock screen"
          title="Enter lock screen"
          className="grid h-10 w-10 place-items-center rounded-full bg-surface/70 text-foreground"
        >
          <Lock className="h-4 w-4" />
        </button>
      </header>

      {tab === "player" && (
        <div className="flex flex-1 flex-col px-6 pb-8 overflow-y-auto">
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

          {/* autoplay toggle */}
          <button
            onClick={() => setAutoplayEnabled(!autoplayEnabled)}
            className={cn(
              "mt-4 flex items-center justify-between rounded-2xl border border-border px-4 py-3 transition-colors cursor-pointer",
              autoplayEnabled ? "bg-brand/10" : "bg-surface/50",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <InfinityIcon
                className={cn("h-4 w-4", autoplayEnabled ? "text-brand" : "text-muted-foreground")}
              />
              Autoplay
              {isLoadingAutoplay && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </span>
            <span
              className={cn(
                "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                autoplayEnabled ? "bg-brand" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform",
                  autoplayEnabled ? "translate-x-[18px]" : "translate-x-0.5",
                )}
              />
            </span>
          </button>

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
      )}

      {tab === "queue" && (
        <div className="flex flex-1 flex-col px-5 pb-8 overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold font-display">Up Next</h3>
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
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
                    className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "recommended" && (
        <div className="flex flex-1 flex-col px-5 pb-8 overflow-hidden">
          <div className="mb-3">
            <h3 className="text-lg font-semibold font-display">Recommended</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Based on {current.title}</p>
          </div>
          {loadingRecs && recommended.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground flex-1">
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
              Finding similar music...
            </div>
          ) : recommended.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground flex-1 flex items-center justify-center">
              No recommendations found for this track.
            </p>
          ) : (
            <ul className="space-y-1 overflow-auto flex-1 pr-1">
              {recommended.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-hover group"
                >
                  <button
                    onClick={() => playTrack(t, { queue: [t, ...recommended.filter((x) => x.id !== t.id)] })}
                    className="flex flex-1 items-center gap-3 min-w-0 text-left cursor-pointer"
                  >
                    <img src={t.thumbnail} alt="" className="h-10 w-10 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium group-hover:text-brand transition-colors">{t.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{t.channel}</p>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground mr-1">{t.duration}</span>
                  </button>
                  <button
                    onClick={() => {
                      addToQueue(t);
                      toast.success(`Added "${t.title}" to queue`);
                    }}
                    title="Add to queue"
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted/30 hover:text-foreground active:scale-90 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
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