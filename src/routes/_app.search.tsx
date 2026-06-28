import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { Screen, ScreenHeader } from "@/components/layout/Screen";
import { TrackRow } from "@/components/player/TrackRow";
import { searchYouTube, type YTTrack } from "@/lib/youtube.functions";
import { usePlayer } from "@/lib/player";

export const Route = createFileRoute("/_app/search")({
  head: () => ({
    meta: [
      { title: "Search — Sonance" },
      { name: "description", content: "Search YouTube and play any track." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<YTTrack[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playTrack } = usePlayer();
  const fn = useServerFn(searchYouTube);
  const mutation = useMutation({
    mutationFn: async (query: string) => fn({ data: { query } }),
    onSuccess: (r) => setResults(r),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Screen>
      <ScreenHeader eyebrow="Discover" title="Search" subtitle="Anything on YouTube." />

      <div className="px-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) mutation.mutate(q.trim());
          }}
          className="relative"
        >
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            inputMode="search"
            placeholder="Songs, artists, anything"
            className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-12 text-sm outline-none placeholder:text-muted-foreground focus:border-brand/50 focus:ring-2 focus:ring-brand/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setResults([]);
                inputRef.current?.focus();
              }}
              aria-label="Clear"
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>

      <div className="mt-4 px-5">
        {mutation.isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        )}
        {mutation.isError && (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            Could not load results. Try again.
          </p>
        )}
        {!mutation.isPending && results.length === 0 && !mutation.isError && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Search for a song to get started.
          </p>
        )}
        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((t) => (
              <TrackRow
                key={t.id}
                track={t}
                onPlay={() => playTrack(t, { queue: results })}
              />
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
