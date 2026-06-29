import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, ChevronUp, Music2 } from "lucide-react";
import { format } from "date-fns";
import { usePlayer, formatTime } from "@/lib/player";
import { cn } from "@/lib/utils";

const DOUBLE_TAP_WINDOW_MS = 320;

/**
 * A mock phone lock-screen. Lets you "minimize" Musio without actually
 * leaving the PWA — you get a clock + ambient wallpaper + a glanceable
 * now-playing widget instead of losing the tab/app to the background.
 * Double-tap anywhere (outside the controls) to unlock back into the app.
 */
export function LockScreen() {
  const { locked, unlock, current, playing, togglePlay, next, previous, position, duration } =
    usePlayer();

  const [now, setNow] = useState(() => new Date());
  const [pulse, setPulse] = useState(false);
  const lastTapRef = useRef(0);
  const pulseTimeoutRef = useRef<number | null>(null);

  // Live clock — only ticks while the lock screen is actually shown.
  useEffect(() => {
    if (!locked) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [locked]);

  // Keep the screen awake while locked so the ambience doesn't dim/sleep
  // mid-song. Not all browsers support this (notably iOS home-screen PWAs
  // at the time of writing) — fails silently where unsupported.
  useEffect(() => {
    if (!locked) return;
    let sentinel: { release?: () => Promise<void> } | null = null;
    (async () => {
      try {
        if ("wakeLock" in navigator) {
          sentinel = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        /* unsupported or denied — safe to ignore */
      }
    })();
    return () => {
      try {
        sentinel?.release?.();
      } catch {}
    };
  }, [locked]);

  // Freeze page scroll while locked, and let Escape unlock (handy on desktop).
  useEffect(() => {
    if (!locked) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") unlock();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [locked, unlock]);

  if (!locked) return null;

  const handleTap = () => {
    const t = Date.now();
    if (t - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) {
      lastTapRef.current = 0;
      unlock();
      return;
    }
    lastTapRef.current = t;
    setPulse(true);
    if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = window.setTimeout(() => setPulse(false), 550);
  };

  const totalDuration = duration || current?.durationSeconds || 0;
  const pct = totalDuration ? Math.min(100, (position / totalDuration) * 100) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Lock screen. Double tap to unlock."
      onClick={handleTap}
      className="fixed inset-0 z-[100] flex select-none flex-col overflow-hidden bg-background"
    >
      {/* ambient wallpaper, gently breathing */}
      <div
        aria-hidden
        className="lockscreen-bg pointer-events-none absolute inset-0 -z-10 opacity-70 blur-3xl"
        style={{
          backgroundImage: current
            ? `url(${current.thumbnail})`
            : "radial-gradient(60% 50% at 50% 20%, color-mix(in oklab, var(--color-brand) 25%, transparent), transparent 70%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background/70" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/20 via-transparent to-background"
      />

      {/* wordmark */}
      <div className="flex justify-center pt-[calc(env(safe-area-inset-top)+18px)]">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
          Musio
        </span>
      </div>

      {/* clock */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex items-baseline gap-2 font-display tabular-nums">
          <span className="text-7xl font-bold tracking-tight text-foreground sm:text-8xl">
            {format(now, "h:mm")}
          </span>
          <span className="text-xl font-semibold text-muted-foreground">{format(now, "a")}</span>
        </div>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {format(now, "EEEE, MMMM d")}
        </p>
      </div>

      {/* now playing glance */}
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+28px)]">
        {current ? (
          <div className="glass rounded-3xl border border-border p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3">
              <img
                src={current.thumbnail}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{current.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{current.channel}</p>
              </div>
            </div>

            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-brand transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>{formatTime(position)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-8">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  previous();
                }}
                aria-label="Previous"
                className="grid h-11 w-11 place-items-center rounded-full text-foreground active:scale-90"
              >
                <SkipBack className="h-5 w-5 fill-current" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                aria-label={playing ? "Pause" : "Play"}
                className="grid h-14 w-14 place-items-center rounded-full bg-brand text-primary-foreground shadow-[0_10px_30px_-5px_var(--color-brand-glow)] transition-transform active:scale-95"
              >
                {playing ? (
                  <Pause className="h-6 w-6 fill-current" />
                ) : (
                  <Play className="h-6 w-6 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
                className="grid h-11 w-11 place-items-center rounded-full text-foreground active:scale-90"
              >
                <SkipForward className="h-5 w-5 fill-current" />
              </button>
            </div>
          </div>
        ) : (
          <div className="glass flex items-center justify-center gap-2 rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <Music2 className="h-4 w-4" />
            Nothing playing
          </div>
        )}

        {/* unlock hint */}
        <div
          className={cn(
            "mt-5 flex flex-col items-center gap-1 text-muted-foreground transition-opacity duration-200",
            pulse ? "opacity-100" : "opacity-60",
          )}
        >
          <ChevronUp className="h-4 w-4 animate-bounce" />
          <span className="text-[11px] font-medium uppercase tracking-widest">
            Double tap to unlock
          </span>
        </div>
      </div>

      <style>{`
        .lockscreen-bg {
          transform: scale(1.1);
          animation: lockscreen-breathe 10s ease-in-out infinite;
        }
        @keyframes lockscreen-breathe {
          0%, 100% { transform: scale(1.1); }
          50% { transform: scale(1.18); }
        }
      `}</style>
    </div>
  );
}