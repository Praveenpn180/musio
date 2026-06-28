import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Screen, ScreenHeader } from "@/components/layout/Screen";
import { TrackRow } from "@/components/player/TrackRow";
import { useLibrary } from "@/lib/library-store";
import { usePlayer } from "@/lib/player";
import { Play, Shuffle } from "lucide-react";

export const Route = createFileRoute("/_app/library")({
  head: () => ({
    meta: [
      { title: "Library — Sonance" },
      { name: "description", content: "Every track you've saved." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { state } = useLibrary();
  const { playTrack } = usePlayer();
  const [q, setQ] = useState("");

  const tracks = useMemo(() => {
    const list = Object.values(state.saved).sort((a, b) => a.title.localeCompare(b.title));
    if (!q) return list;
    const t = q.toLowerCase();
    return list.filter(
      (x) => x.title.toLowerCase().includes(t) || x.channel.toLowerCase().includes(t),
    );
  }, [state.saved, q]);

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Your collection"
        title="Library"
        subtitle={`${Object.keys(state.saved).length} saved tracks`}
      />

      {tracks.length > 0 && (
        <div className="flex items-center gap-2 px-5">
          <button
            onClick={() => playTrack(tracks[0], { queue: tracks })}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--color-brand-glow)] active:scale-95"
          >
            <Play className="h-4 w-4 fill-current" /> Play all
          </button>
          <button
            onClick={() => {
              const shuffled = [...tracks].sort(() => Math.random() - 0.5);
              playTrack(shuffled[0], { queue: shuffled });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold active:scale-95"
          >
            <Shuffle className="h-4 w-4" /> Shuffle
          </button>
        </div>
      )}

      <div className="mt-4 px-5">
        {Object.keys(state.saved).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            Your library is empty. Save tracks from search using the menu.
          </p>
        ) : (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter library"
              className="mb-3 h-10 w-full rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-brand/50"
            />
            <div className="space-y-1">
              {tracks.map((t) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  onPlay={() => playTrack(t, { queue: tracks })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
