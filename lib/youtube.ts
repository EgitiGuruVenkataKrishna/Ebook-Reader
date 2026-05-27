export type YouTubeVideoRef = {
  id: string;
  canonicalUrl: string;
};

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeUrl(input: string): YouTubeVideoRef {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid YouTube URL.");
  }

  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(pathParts[0])) {
      id = pathParts[1] ?? null;
    }
  }

  if (!id || !VIDEO_ID_PATTERN.test(id)) {
    throw new Error("The URL does not look like a supported YouTube video link.");
  }

  return {
    id,
    canonicalUrl: `https://www.youtube.com/watch?v=${id}`
  };
}

export async function fetchYouTubeMetadata(video: YouTubeVideoRef) {
  const fallback = {
    videoId: video.id,
    title: "Untitled YouTube source",
    channel: "YouTube",
    durationSeconds: null as number | null,
    thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
  };

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return fallback;

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${video.id}&key=${key}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) return fallback;

    const payload = (await response.json()) as {
      items?: Array<{
        snippet?: {
          title?: string;
          channelTitle?: string;
          thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
        };
        contentDetails?: { duration?: string };
      }>;
    };

    const item = payload.items?.[0];
    if (!item) return fallback;

    return {
      videoId: video.id,
      title: item.snippet?.title ?? fallback.title,
      channel: item.snippet?.channelTitle ?? fallback.channel,
      durationSeconds: item.contentDetails?.duration
        ? parseIsoDuration(item.contentDetails.duration)
        : null,
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        fallback.thumbnailUrl
    };
  } catch {
    return fallback;
  }
}

export function parseIsoDuration(value: string): number {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;

  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}
