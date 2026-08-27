import { createFileRoute } from "@tanstack/react-router";
import { Screen, ScreenHeader } from "@/components/layout/Screen";
import { TrackRow } from "@/components/player/TrackRow";
import { useLibrary } from "@/lib/library-store";
import { usePlayer } from "@/lib/player";
import { useSelection } from "@/lib/selection-context";
import { Heart, Play, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/_app/favorites")({
  head: () => ({
    meta: [
      { title: "Favorites — Musio" },
      { name: "description", content: "Tracks you love." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { state } = useLibrary();
  const { playTrack } = usePlayer();
  const { selectionMode, toggleSelectionMode, selectAllTracks } = useSelection();
  const tracks = state.favorites.map((id) => state.saved[id]).filter(Boolean);

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Heart-marked"
        title="Favorites"
        subtitle={`${tracks.length} tracks`}
      />

      {tracks.length === 0 ? (
        <p className="mx-5 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Tap the heart on any track to favorite it.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 px-5">
            <button
              onClick={() => playTrack(tracks[0], { queue: tracks })}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--color-brand-glow)] active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" /> Play all
            </button>

            <button
              onClick={() => {
                if (!selectionMode) {
                  selectAllTracks(tracks);
                } else {
                  toggleSelectionMode();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover active:scale-95"
            >
              <CheckSquare className="h-3.5 w-3.5 text-brand" />
              <span>{selectionMode ? "Cancel Select" : "Select Songs"}</span>
            </button>
          </div>
          <div className="mt-4 space-y-1 px-5">
            {tracks.map((t) => (
              <TrackRow key={t.id} track={t} onPlay={() => playTrack(t, { queue: tracks })} />
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

