import { Play, Pause, SkipForward } from "lucide-react";
import { usePlayer } from "@/lib/player";
import { cn } from "@/lib/utils";

export function MiniPlayer() {
  const { current, playing, togglePlay, next, position, duration, setShowNowPlaying } =
    usePlayer();

  if (!current) return null;

  const pct = duration ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+56px)] z-40 md:inset-x-4">
      <button
        type="button"
        onClick={() => setShowNowPlaying(true)}
        className="glass group flex w-full items-center gap-3 rounded-2xl border border-border p-2 pr-3 text-left shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-transform active:scale-[0.99]"
      >
        <img
          src={current.thumbnail}
          alt=""
          className="h-12 w-12 shrink-0 rounded-xl object-cover"
          loading="lazy"
          width={48}
          height={48}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{current.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{current.channel}</p>
        </div>
        <div className="flex items-center gap-1">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                togglePlay();
              }
            }}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full bg-brand text-primary-foreground",
              "transition-transform active:scale-95",
            )}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                next();
              }
            }}
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Next track"
          >
            <SkipForward className="h-4 w-4" />
          </span>
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-[2px] rounded-b-2xl bg-brand transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </button>
    </div>
  );
}
