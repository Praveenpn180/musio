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

function parseISODuration(durationStr: string): number {
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

async function searchWithScraper(query: string): Promise<YTTrack[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query + " music",
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
}

export const searchYouTube = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ query: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }): Promise<YTTrack[]> => {
    const apiKey = process.env.YOUTUBE_DATA_API_KEY;

    if (apiKey) {
      try {
        // 1. Search for videos using YouTube Data API v3
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          data.query + " music"
        )}&type=video&maxResults=25&key=${apiKey}`;

        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) {
          throw new Error(`YouTube API Search responded ${searchRes.status}`);
        }

        const searchData = await searchRes.json();
        const items = searchData.items ?? [];

        if (items.length > 0) {
          const videoIds = items.map((item: any) => item.id.videoId).filter(Boolean);

          if (videoIds.length > 0) {
            // 2. Fetch details (durations) for the found videos using YouTube Data API v3
            const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(
              ","
            )}&key=${apiKey}`;

            const videosRes = await fetch(videosUrl);
            if (!videosRes.ok) {
              throw new Error(`YouTube API Videos responded ${videosRes.status}`);
            }

            const videosData = await videosRes.json();
            const videoDetails = videosData.items ?? [];

            // Map videoId -> durationSeconds
            const durationMap: Record<string, number> = {};
            for (const details of videoDetails) {
              const isoDuration = details.contentDetails?.duration;
              if (isoDuration) {
                durationMap[details.id] = parseISODuration(isoDuration);
              }
            }

            // 3. Construct YTTrack objects
            const results: YTTrack[] = [];
            for (const item of items) {
              const videoId = item.id?.videoId;
              if (!videoId) continue;

              const durSec = durationMap[videoId] || 0;
              const title = decodeHtmlEntities(item.snippet?.title ?? "");
              const channel = decodeHtmlEntities(item.snippet?.channelTitle ?? "");
              const thumbs = item.snippet?.thumbnails;
              const thumbnail =
                thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

              // Keep the original duration filters (tracks under 20 minutes)
              if (durSec > 0 && durSec < 60 * 20) {
                results.push({
                  id: videoId,
                  title,
                  channel,
                  duration: formatDuration(durSec),
                  durationSeconds: durSec,
                  thumbnail,
                });
              }
            }
            return results;
          }
        }
      } catch (error) {
        console.warn("YouTube API search failed, falling back to HTML scraping:", error);
      }
    }

    // Fallback: Run HTML scraper if API key is not present or query failed
    return searchWithScraper(data.query);
  });
