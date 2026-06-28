import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ListMusic } from "lucide-react";
import { Screen, ScreenHeader } from "@/components/layout/Screen";
import { useLibrary } from "@/lib/library-store";

export const Route = createFileRoute("/_app/playlists/")({
  head: () => ({
    meta: [
      { title: "Playlists — Sonance" },
      { name: "description", content: "Curate your own playlists." },
    ],
  }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const { state, createPlaylist } = useLibrary();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Your collections"
        title="Playlists"
        subtitle={`${state.playlists.length} playlists`}
        action={
          <button
            onClick={() => setCreating(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-brand text-primary-foreground shadow-[0_8px_24px_-8px_var(--color-brand-glow)]"
            aria-label="New playlist"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              createPlaylist(name.trim());
              setName("");
              setCreating(false);
            }
          }}
          className="mx-5 mb-4 flex gap-2 rounded-2xl border border-border bg-card p-2"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist name"
            className="h-10 flex-1 rounded-full bg-surface px-4 text-sm outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-brand px-4 text-sm font-semibold text-primary-foreground"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setName("");
            }}
            className="rounded-full px-3 text-sm text-muted-foreground"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="px-5">
        {state.playlists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <ListMusic className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">No playlists yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap + to create your first playlist.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {state.playlists.map((p) => {
              const first = p.trackIds.map((id) => state.saved[id]).filter(Boolean).slice(0, 4);
              return (
                <li key={p.id}>
                  <Link
                    to="/playlists/$id"
                    params={{ id: p.id }}
                    className="group block overflow-hidden rounded-2xl border border-border bg-card/60 transition-colors hover:border-brand/40"
                  >
                    <div className="aspect-square w-full bg-surface">
                      {first.length === 0 ? (
                        <div className="grid h-full place-items-center text-muted-foreground">
                          <ListMusic className="h-8 w-8" />
                        </div>
                      ) : (
                        <div className="grid h-full grid-cols-2 grid-rows-2">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="overflow-hidden bg-surface">
                              {first[i] && (
                                <img
                                  src={first[i].thumbnail}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.trackIds.length} {p.trackIds.length === 1 ? "track" : "tracks"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Screen>
  );
}
