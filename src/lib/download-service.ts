import { toast } from "sonner";
import type { YTTrack } from "./youtube.functions";

/**
 * Triggers a browser download for a given audio URL or blob.
 */
/**
 * Triggers a browser download for a given audio URL or base64 data.
 */
export async function saveAudioFile(
  url: string,
  filename: string,
  base64Data?: string,
  mimeType?: string,
): Promise<void> {
  if (base64Data) {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType || "audio/webm" });
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
      }, 2000);
      return;
    } catch (e) {
      console.warn("Base64 blob download failed, falling back to direct URL:", e);
    }
  }

  // Direct download attempt via blob fetch or anchor tag
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
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
      }, 2000);
      return;
    }
  } catch {
    // Cross-origin fallback
  }

  // Anchor fallback for cross-origin URLs
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

/**
 * Download a single track with toast feedback.
 */
export async function downloadSingleTrack(
  track: YTTrack,
  getAudioDownloadUrlFn: (args: { data: { videoId: string; title?: string } }) => Promise<{
    url: string;
    ext: string;
    filename: string;
    base64Data?: string;
    mimeType?: string;
  }>,
): Promise<boolean> {
  const toastId = toast.loading(`Preparing download for "${track.title}"...`);
  try {
    const downloadInfo = await getAudioDownloadUrlFn({
      data: { videoId: track.id, title: track.title },
    });
    
    toast.loading(`Downloading "${track.title}"...`, { id: toastId });
    await saveAudioFile(
      downloadInfo.url,
      downloadInfo.filename,
      downloadInfo.base64Data,
      downloadInfo.mimeType,
    );
    
    toast.success(`Download started for "${track.title}"`, { id: toastId });
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
    base64Data?: string;
    mimeType?: string;
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
      await saveAudioFile(info.url, info.filename, info.base64Data, info.mimeType);
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

  if (succeeded > 0 && failed === 0) {
    toast.success(`Successfully downloaded all ${succeeded} songs!`, {
      id: batchToastId,
    });
  } else if (succeeded > 0 && failed > 0) {
    toast.warning(`Downloaded ${succeeded} of ${total} songs (${failed} failed).`, {
      id: batchToastId,
    });
  } else {
    toast.error(`Failed to download selected tracks. Please try again later.`, {
      id: batchToastId,
    });
  }

  return { succeeded, failed };
}
