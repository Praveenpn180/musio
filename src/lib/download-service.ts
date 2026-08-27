import { toast } from "sonner";
import type { YTTrack } from "./youtube.functions";

/**
 * Triggers a browser download for a given audio URL or blob.
 */
export async function saveAudioFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch {
    // Direct link fallback if blob fetch suffers CORS restriction
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 1000);
  }
}

/**
 * Download a single track with toast feedback.
 */
export async function downloadSingleTrack(
  track: YTTrack,
  getAudioDownloadUrlFn: (args: { data: { videoId: string; title?: string } }) => Promise<{
    url: string;
    ext: string;
    filename: string;
  }>,
): Promise<boolean> {
  const toastId = toast.loading(`Preparing download for "${track.title}"...`);
  try {
    const downloadInfo = await getAudioDownloadUrlFn({
      data: { videoId: track.id, title: track.title },
    });
    
    toast.loading(`Downloading "${track.title}"...`, { id: toastId });
    await saveAudioFile(downloadInfo.url, downloadInfo.filename);
    
    toast.success(`Downloaded "${track.title}"`, { id: toastId });
    return true;
  } catch (error: any) {
    console.error("Single download error:", error);
    toast.error(`Failed to download "${track.title}": ${error.message || "Unknown error"}`, {
      id: toastId,
    });
    return false;
  }
}

/**
 * Download multiple tracks sequentially with batch progress reporting.
 */
export async function downloadMultipleTracks(
  tracks: YTTrack[],
  getAudioDownloadUrlFn: (args: { data: { videoId: string; title?: string } }) => Promise<{
    url: string;
    ext: string;
    filename: string;
  }>,
  onProgress?: (current: number, total: number, currentTrackTitle: string) => void,
): Promise<{ succeeded: number; failed: number }> {
  if (tracks.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const total = tracks.length;

  const batchToastId = toast.loading(`Starting download for ${total} songs...`);

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    onProgress?.(i + 1, total, track.title);
    toast.loading(`Downloading song ${i + 1} of ${total}: "${track.title}"`, {
      id: batchToastId,
    });

    try {
      const info = await getAudioDownloadUrlFn({
        data: { videoId: track.id, title: track.title },
      });
      await saveAudioFile(info.url, info.filename);
      succeeded++;
    } catch (err) {
      console.error(`Failed downloading ${track.title}:`, err);
      failed++;
    }

    // Short pause between sequential downloads to allow browser event loop and prevent popup blocking
    if (i < tracks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  if (failed === 0) {
    toast.success(`Successfully downloaded all ${succeeded} songs!`, { id: batchToastId });
  } else {
    toast.warning(`Completed with ${succeeded} downloaded, ${failed} failed.`, { id: batchToastId });
  }

  return { succeeded, failed };
}
