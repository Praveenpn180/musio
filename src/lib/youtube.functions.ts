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

function detectLanguageOrRegion(title: string, channel: string): string | null {
  const text = `${title} ${channel}`.toLowerCase();

  // 1. Script-based detection
  if (/[\u0900-\u097F]/.test(title)) return "hindi";
  if (/[\u0B80-\u0BFF]/.test(title)) return "tamil";
  if (/[\u0C00-\u0C7F]/.test(title)) return "telugu";
  if (/[\u0D00-\u0D7F]/.test(title)) return "malayalam";
  if (/[\u0C80-\u0CFF]/.test(title)) return "kannada";
  if (/[\u0980-\u09FF]/.test(title)) return "bengali";
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(title)) return "korean";
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(title)) return "japanese";
  if (/[\u0400-\u04FF]/.test(title)) return "russian";
  if (/[\u0600-\u06FF]/.test(title)) return "arabic";

  // 2. Channel-based heuristics
  const channelLower = channel.toLowerCase();
  if (
    channelLower.includes("t-series") ||
    channelLower.includes("tseries") ||
    channelLower.includes("zeemusic") ||
    channelLower.includes("tips official") ||
    channelLower.includes("yrf") ||
    channelLower.includes("yash raj films")
  ) {
    if (text.includes("tamil")) return "tamil";
    if (text.includes("telugu")) return "telugu";
    if (text.includes("punjabi")) return "punjabi";
    if (text.includes("bhojpuri")) return "bhojpuri";
    if (text.includes("malayalam")) return "malayalam";
    if (text.includes("kannada")) return "kannada";
    return "hindi";
  }
  if (
    channelLower.includes("aditya music") ||
    channelLower.includes("adityamusic") ||
    channelLower.includes("lahari music") ||
    channelLower.includes("madhura audio") ||
    channelLower.includes("mango music")
  ) {
    return "telugu";
  }
  if (
    channelLower.includes("think music") ||
    channelLower.includes("thinkmusicsouth") ||
    channelLower.includes("sony music south")
  ) {
    if (text.includes("telugu")) return "telugu";
    if (text.includes("malayalam")) return "malayalam";
    if (text.includes("kannada")) return "kannada";
    return "tamil";
  }
  if (channelLower.includes("muzik247") || channelLower.includes("satyam audios")) {
    return "malayalam";
  }
  if (
    channelLower.includes("speed records") ||
    channelLower.includes("geet mp3") ||
    channelLower.includes("white hill music") ||
    channelLower.includes("jass records")
  ) {
    return "punjabi";
  }
  if (
    channelLower.includes("smtown") ||
    channelLower.includes("jyp entertainment") ||
    channelLower.includes("hybe labels") ||
    channelLower.includes("yg entertainment") ||
    channelLower.includes("stone music")
  ) {
    return "korean";
  }

  // 3. Keyword-based detection
  const keywords: Record<string, string[]> = {
    tamil: ["tamil", "kollywood", "anirudh", "ar rahman"],
    telugu: ["telugu", "tollywood", "devi sri prasad", "thaman s"],
    hindi: ["hindi", "bollywood", "arijit singh", "nehakakkar", "coke studio"],
    punjabi: ["punjabi", "ap dhillon", "diljit dosanjh", "moose wala", "karan aujla"],
    malayalam: ["malayalam", "mollywood", "sushin shyam"],
    kannada: ["kannada", "sandalwood"],
    korean: ["korean", "k-pop", "kpop", "bts", "blackpink", "twice", "newjeans"],
    japanese: ["japanese", "j-pop", "jpop", "anime ost", "vocaloid"],
    spanish: ["spanish", "español", "reggaeton", "bad bunny", "latino"],
    french: ["french", "français"],
  };

  for (const [lang, list] of Object.entries(keywords)) {
    for (const kw of list) {
      if (text.includes(kw)) {
        return lang;
      }
    }
  }

  return null;
}

export const getRecommendations = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        videoId: z.string().optional(),
        title: z.string().optional(),
        channel: z.string().optional(),
        preferredLanguages: z.array(z.string()).optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<YTTrack[]> => {
    const apiKey = process.env.YOUTUBE_DATA_API_KEY;
    let query = "Pop Music Hits";
    if (data.title && data.channel) {
      const cleanTitle = data.title
        .replace(/\(Official.*?\)/gi, "")
        .replace(/\[Official.*?\]/gi, "")
        .replace(/\(Remastered.*?\)/gi, "")
        .replace(/\(Video.*?\)/gi, "")
        .replace(/\(Lyric.*?\)/gi, "")
        .trim();

      // 1. Detect language of the basis song
      let lang = detectLanguageOrRegion(data.title, data.channel);

      // 2. Fall back to user preferences if language isn't directly detectable
      if (!lang && data.preferredLanguages && data.preferredLanguages.length > 0) {
        lang = data.preferredLanguages[0];
      }

      query = lang
        ? `${data.channel} ${cleanTitle} ${lang} radio`
        : `${data.channel} ${cleanTitle} radio`;
    }

    try {
      if (apiKey) {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          query
        )}&type=video&maxResults=15&key=${apiKey}`;

        const searchRes = await fetch(searchUrl);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const items = searchData.items ?? [];
          if (items.length > 0) {
            const videoIds = items.map((item: any) => item.id.videoId).filter(Boolean);
            if (videoIds.length > 0) {
              const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(
                ","
              )}&key=${apiKey}`;
              const videosRes = await fetch(videosUrl);
              if (videosRes.ok) {
                const videosData = await videosRes.json();
                const videoDetails = videosData.items ?? [];
                const durationMap: Record<string, number> = {};
                for (const details of videoDetails) {
                  const isoDuration = details.contentDetails?.duration;
                  if (isoDuration) {
                    durationMap[details.id] = parseISODuration(isoDuration);
                  }
                }

                const results: YTTrack[] = [];
                for (const item of items) {
                  const videoId = item.id?.videoId;
                  if (!videoId || videoId === data.videoId) continue;

                  const durSec = durationMap[videoId] || 0;
                  const title = decodeHtmlEntities(item.snippet?.title ?? "");
                  const channel = decodeHtmlEntities(item.snippet?.channelTitle ?? "");
                  const thumbs = item.snippet?.thumbnails;
                  const thumbnail =
                    thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

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
          }
        }
      }
    } catch (e) {
      console.warn("YouTube API recommendations failed, falling back to scraper:", e);
    }

    const rawList = await searchWithScraper(query);
    return rawList.filter((x) => x.id !== data.videoId);
  });

