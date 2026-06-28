import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type YTTrack = {
  id: string;
  title: string;
  channel: string;
  duration: string; // mm:ss
  durationSeconds: number;
  thumbnail: string;
};

function parseDuration(text: string): number {
  if (!text) return 0;
  const parts = text.split(":").map((n) => parseInt(n, 10));
  if (parts.some(Number.isNaN)) return 0;
  let secs = 0;
  for (const p of parts) secs = secs * 60 + p;
  return secs;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const searchYouTube = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ query: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }): Promise<YTTrack[]> => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      data.query + " music",
    )}&sp=EgIQAQ%253D%253D`; // filter: videos only

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`YouTube responded ${res.status}`);
    const html = await res.text();

    const marker = "var ytInitialData = ";
    const start = html.indexOf(marker);
    if (start === -1) return [];
    const after = html.slice(start + marker.length);
    const end = after.indexOf(";</script>");
    if (end === -1) return [];
    const jsonStr = after.slice(0, end);
    let data_: any;
    try {
      data_ = JSON.parse(jsonStr);
    } catch {
      return [];
    }

    const results: YTTrack[] = [];
    const sections =
      data_?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents ?? [];
    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents ?? [];
      for (const item of items) {
        const v = item?.videoRenderer;
        if (!v?.videoId) continue;
        const title = v.title?.runs?.[0]?.text ?? "";
        const channel =
          v.ownerText?.runs?.[0]?.text ?? v.longBylineText?.runs?.[0]?.text ?? "";
        const durText: string =
          v.lengthText?.simpleText ?? v.lengthText?.accessibility?.accessibilityData?.label ?? "";
        const durSec = parseDuration(durText);
        const thumbs = v.thumbnail?.thumbnails ?? [];
        const thumbnail = thumbs[thumbs.length - 1]?.url ?? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
        if (durSec > 0 && durSec < 60 * 20) {
          results.push({
            id: v.videoId,
            title,
            channel,
            duration: formatDuration(durSec),
            durationSeconds: durSec,
            thumbnail,
          });
        }
        if (results.length >= 25) break;
      }
      if (results.length >= 25) break;
    }
    return results;
  });
