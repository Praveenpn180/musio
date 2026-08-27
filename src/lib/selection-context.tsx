import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { YTTrack } from "./youtube.functions";
import { getAudioDownloadUrl } from "./youtube.functions";
import { downloadMultipleTracks, downloadSingleTrack } from "./download-service";

type SelectionContextType = {
  selectionMode: boolean;
  selectedMap: Map<string, YTTrack>;
  selectedTracks: YTTrack[];
  selectedCount: number;
  isDownloading: boolean;
  downloadProgress: { current: number; total: number; currentTitle: string } | null;
  toggleSelectionMode: (initialTrack?: YTTrack) => void;
  enableSelectionMode: () => void;
  disableSelectionMode: () => void;
  toggleTrackSelection: (track: YTTrack) => void;
  isTrackSelected: (id: string) => boolean;
  selectAllTracks: (tracks: YTTrack[]) => void;
  clearSelection: () => void;
  downloadSelected: () => Promise<void>;
  downloadSingle: (track: YTTrack) => Promise<boolean>;
};

const SelectionContext = createContext<SelectionContextType | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMap, setSelectedMap] = useState<Map<string, YTTrack>>(new Map());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    current: number;
    total: number;
    currentTitle: string;
  } | null>(null);

  const getAudioDownloadUrlFn = useServerFn(getAudioDownloadUrl);

  const enableSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  const disableSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedMap(new Map());
    setDownloadProgress(null);
  }, []);

  const toggleSelectionMode = useCallback((initialTrack?: YTTrack) => {
    setSelectionMode((prev) => {
      const nextMode = !prev;
      if (!nextMode) {
        setSelectedMap(new Map());
        setDownloadProgress(null);
      } else if (initialTrack) {
        setSelectedMap(new Map([[initialTrack.id, initialTrack]]));
      }
      return nextMode;
    });
  }, []);

  const toggleTrackSelection = useCallback((track: YTTrack) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(track.id)) {
        next.delete(track.id);
      } else {
        next.set(track.id, track);
      }
      return next;
    });
  }, []);

  const isTrackSelected = useCallback(
    (id: string) => {
      return selectedMap.has(id);
    },
    [selectedMap],
  );

  const selectAllTracks = useCallback((tracks: YTTrack[]) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      tracks.forEach((t) => next.set(t.id, t));
      return next;
    });
    setSelectionMode(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMap(new Map());
  }, []);

  const downloadSelected = useCallback(async () => {
    const tracksToDownload = Array.from(selectedMap.values());
    if (tracksToDownload.length === 0 || isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadMultipleTracks(
        tracksToDownload,
        getAudioDownloadUrlFn,
        (current, total, currentTitle) => {
          setDownloadProgress({ current, total, currentTitle });
        },
      );
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
      disableSelectionMode();
    }
  }, [selectedMap, isDownloading, getAudioDownloadUrlFn, disableSelectionMode]);

  const downloadSingle = useCallback(
    async (track: YTTrack) => {
      return downloadSingleTrack(track, getAudioDownloadUrlFn);
    },
    [getAudioDownloadUrlFn],
  );

  const selectedTracks = Array.from(selectedMap.values());
  const selectedCount = selectedMap.size;

  return (
    <SelectionContext.Provider
      value={{
        selectionMode,
        selectedMap,
        selectedTracks,
        selectedCount,
        isDownloading,
        downloadProgress,
        toggleSelectionMode,
        enableSelectionMode,
        disableSelectionMode,
        toggleTrackSelection,
        isTrackSelected,
        selectAllTracks,
        clearSelection,
        downloadSelected,
        downloadSingle,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return ctx;
}
