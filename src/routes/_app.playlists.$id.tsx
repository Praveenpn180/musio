import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Play, Shuffle, Trash2, Pencil } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { TrackRow } from "@/components/player/TrackRow";
import { useLibrary } from "@/lib/library-store";
import { usePlayer } from "@/lib/player";

export const Route = createFileRoute("/_app/playlists/$id")({
  head: () => ({
    meta: [{ title: "Playlist — Musio" }],
  }),
  component: PlaylistDetail,
});

function PlaylistDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { state, removeFromPlaylist, deletePlaylist, renamePlaylist } = useLibrary();
  const { playTrack } = usePlayer();
  const playlist = state.playlists.find((p) => p.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(playlist?.name ?? "");

  if (!playlist) {
    return (
      <Screen>
        <div className="px-5 pt-10">
          <Link to="/playlists" className="text-sm text-brand">
            ← Back to playlists
          </Link>
          <p className="mt-6 text-sm text-muted-foreground">Playlist not found.</p>
        </div>
      </Screen>
    );
  }

  const tracks = playlist.trackIds.map((tid) => state.saved[tid]).filter(Boolean);
  const cover = tracks.slice(0, 4);

  return (
    <Screen>
      <div className="relative px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link
          to="/playlists"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface/70 text-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-4 flex flex-col items-center px-5 text-center">
        <div className="aspect-square w-44 overflow-hidden rounded-2xl bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
          {cover.length === 0 ? (
            <div className="grid h-full place-items-center text-muted-foreground">∿</div>
          ) : (
            <div className="grid h-full grid-cols-2 grid-rows-2">
              {[0, 1, 2, 3].map((i) =>
                cover[i] ? (
                  <img key={i} src={cover[i].thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div key={i} className="bg-surface-hover" />
                ),
              )}
            </div>
          )}
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Playlist
        </p>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) {
                renamePlaylist(playlist.id, name.trim());
                setEditing(false);
              }
            }}
            className="mt-1 flex gap-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-full bg-surface px-4 py-2 text-center text-2xl font-bold outline-none"
            />
            <button className="rounded-full bg-brand px-3 text-sm font-semibold text-primary-foreground">
              Save
            </button>
          </form>
        ) : (
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{playlist.name}</h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            disabled={tracks.length === 0}
            onClick={() => tracks.length && playTrack(tracks[0], { queue: tracks })}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--color-brand-glow)] disabled:opacity-50 active:scale-95"
          >
            <Play className="h-4 w-4 fill-current" /> Play
          </button>
          <button
            disabled={tracks.length === 0}
            onClick={() => {
              const s = [...tracks].sort(() => Math.random() - 0.5);
              playTrack(s[0], { queue: s });
            }}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card disabled:opacity-50"
            aria-label="Shuffle"
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
            aria-label="Rename"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${playlist.name}"?`)) {
                deletePlaylist(playlist.id);
                navigate({ to: "/playlists" });
              }
            }}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-destructive"
            aria-label="Delete playlist"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 px-5">
        {tracks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            No tracks yet. Add some from search or your library.
          </p>
        ) : (
          <div className="space-y-1">
            {tracks.map((t) => (
              <TrackRow
                key={t.id}
                track={t}
                onPlay={() => playTrack(t, { queue: tracks })}
                showRemoveFromPlaylist
                onRemoveFromPlaylist={() => removeFromPlaylist(playlist.id, t.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
