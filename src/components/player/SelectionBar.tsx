import { Download, CheckSquare, Square, X, Loader2 } from "lucide-react";
import { useSelection } from "@/lib/selection-context";
import { cn } from "@/lib/utils";

export function SelectionBar({ currentTracks }: { currentTracks?: any[] }) {
  const {
    selectionMode,
    selectedCount,
    selectedTracks,
    isDownloading,
    downloadProgress,
    downloadSelected,
    disableSelectionMode,
    clearSelection,
    selectAllTracks,
  } = useSelection();

  if (!selectionMode) return null;

  const allSelected =
    currentTracks && currentTracks.length > 0 && selectedCount === currentTracks.length;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 z-40 w-[92%] max-w-xl -translate-x-1/2 rounded-2xl border border-brand/30 bg-surface/95 backdrop-blur-xl p-3 shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5",
        "md:bottom-6",
      )}
    >
      {/* Download progress bar */}
      {isDownloading && downloadProgress && (
        <div className="mb-2 space-y-1">
          <div className="flex justify-between text-xs font-medium text-brand">
            <span className="truncate pr-2">
              Downloading: {downloadProgress.currentTitle}
            </span>
            <span>
              {downloadProgress.current} / {downloadProgress.total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{
                width: `${(downloadProgress.current / downloadProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={disableSelectionMode}
            disabled={isDownloading}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            aria-label="Exit selection mode"
          >
            <X className="h-4 w-4" />
          </button>

          <span className="text-sm font-semibold">
            {selectedCount} <span className="hidden sm:inline">song{selectedCount === 1 ? "" : "s"}</span> selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentTracks && currentTracks.length > 0 && (
            <button
              onClick={() => {
                if (allSelected) {
                  clearSelection();
                } else {
                  selectAllTracks(currentTracks);
                }
              }}
              disabled={isDownloading}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            >
              {allSelected ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  <span>Deselect all</span>
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Select all</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={downloadSelected}
            disabled={selectedCount === 0 || isDownloading}
            className={cn(
              "flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download ({selectedCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
