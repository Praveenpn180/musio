import { useState } from "react";
import { Play, Plus, Heart, ListPlus, MoreHorizontal, Trash2, Download, CheckSquare, Square, Check } from "lucide-react";
import type { Track } from "@/lib/library-store";
import { useLibrary } from "@/lib/library-store";
import { usePlayer } from "@/lib/player";
import { useSelection } from "@/lib/selection-context";
import { cn } from "@/lib/utils";

export function TrackRow({
  track,
  index,
  onPlay,
  showRemoveFromPlaylist,
  onRemoveFromPlaylist,
}: {
  track: Track;
  index?: number;
  onPlay?: () => void;
  showRemoveFromPlaylist?: boolean;
  onRemoveFromPlaylist?: () => void;
}) {
  const { isFavorite, toggleFavorite, saveTrack, isSaved, removeTrack, state, addToPlaylist } =
    useLibrary();
  const { playTrack, addToQueue, current, playing } = usePlayer();
  const {
    selectionMode,
    isTrackSelected,
    toggleTrackSelection,
    enableSelectionMode,
    downloadSingle,
  } = useSelection();

  const [menuOpen, setMenuOpen] = useState(false);
  const fav = isFavorite(track.id);
  const isCurrent = current?.id === track.id;
  const selected = isTrackSelected(track.id);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-xl p-2 transition-colors",
        "hover:bg-surface-hover",
        isCurrent && "bg-surface-hover",
        selected && "bg-brand/10 hover:bg-brand/15 border border-brand/20",
      )}
    >
      {/* Selection Checkbox */}
      {selectionMode ? (
        <button
          onClick={() => toggleTrackSelection(track)}
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition-colors",
            selected
              ? "border-brand bg-brand text-brand-foreground"
              : "border-border bg-surface hover:border-brand/60",
          )}
          aria-label={selected ? `Deselect ${track.title}` : `Select ${track.title}`}
        >
          {selected && <Check className="h-4 w-4 stroke-[3]" />}
        </button>
      ) : null}

      <button
        onClick={() => {
          if (selectionMode) {
            toggleTrackSelection(track);
          } else if (onPlay) {
            onPlay();
          } else {
            playTrack(track);
          }
        }}
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface"
        aria-label={`Play ${track.title}`}
      >
        <img src={track.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
        <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-5 w-5 fill-white text-white" />
        </span>
        {isCurrent && playing && (
          <span className="absolute inset-0 grid place-items-center bg-black/50">
            <span className="flex h-3 items-end gap-[2px]">
              <span className="block w-[3px] animate-pulse rounded-sm bg-brand" style={{ animationDelay: "0ms", height: "60%" }} />
              <span className="block w-[3px] animate-pulse rounded-sm bg-brand" style={{ animationDelay: "150ms", height: "100%" }} />
              <span className="block w-[3px] animate-pulse rounded-sm bg-brand" style={{ animationDelay: "300ms", height: "70%" }} />
            </span>
          </span>
        )}
      </button>

      <button
        onClick={() => {
          if (selectionMode) {
            toggleTrackSelection(track);
          } else if (onPlay) {
            onPlay();
          } else {
            playTrack(track);
          }
        }}
        className="min-w-0 flex-1 text-left"
      >
        <p className={cn("truncate text-sm font-semibold", isCurrent && "text-brand")}>
          {track.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {track.channel} · {track.duration}
        </p>
      </button>

      <button
        onClick={() => toggleFavorite(track)}
        aria-label="Favorite"
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full",
          fav ? "text-brand" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Heart className={cn("h-4 w-4", fav && "fill-brand")} />
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More"
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
        {menuOpen && (
          <>
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <div className="absolute right-0 top-10 z-40 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
              <MenuItem
                icon={<Download className="h-4 w-4" />}
                label="Download song"
                onClick={() => {
                  setMenuOpen(false);
                  downloadSingle(track);
                }}
              />
              <MenuItem
                icon={<CheckSquare className="h-4 w-4" />}
                label={selected ? "Deselect song" : "Select song"}
                onClick={() => {
                  setMenuOpen(false);
                  if (!selectionMode) {
                    enableSelectionMode();
                  }
                  toggleTrackSelection(track);
                }}
              />
              <MenuItem
                icon={<ListPlus className="h-4 w-4" />}
                label="Add to queue"
                onClick={() => {
                  addToQueue(track);
                  setMenuOpen(false);
                }}
              />
              {!isSaved(track.id) ? (
                <MenuItem
                  icon={<Plus className="h-4 w-4" />}
                  label="Save to library"
                  onClick={() => {
                    saveTrack(track);
                    setMenuOpen(false);
                  }}
                />
              ) : (
                <MenuItem
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Remove from library"
                  onClick={() => {
                    removeTrack(track.id);
                    setMenuOpen(false);
                  }}
                />
              )}
              {state.playlists.length > 0 && (
                <div className="border-t border-border">
                  <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Add to playlist
                  </div>
                  <div className="max-h-40 overflow-auto py-1">
                    {state.playlists.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          addToPlaylist(p.id, track);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-surface-hover"
                      >
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showRemoveFromPlaylist && (
                <MenuItem
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Remove from playlist"
                  onClick={() => {
                    onRemoveFromPlaylist?.();
                    setMenuOpen(false);
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {typeof index === "number" && !selectionMode && (
        <span className="absolute -left-5 top-1/2 hidden -translate-y-1/2 text-[10px] font-mono text-muted-foreground md:block">
          {index + 1}
        </span>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-surface-hover"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

