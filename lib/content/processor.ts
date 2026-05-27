import { z } from "zod";
import { buildContentPlan } from "./planner";
import { generateOutputs } from "./generator";
import type { ProcessingResult } from "./types";
import { fetchYouTubeMetadata, parseYouTubeUrl } from "@/lib/youtube";

export const processRequestSchema = z.object({
  url: z.string().min(1, "Paste a YouTube URL."),
  audience: z.string().min(2).max(120).default("founders and content operators"),
  tone: z.enum(["executive", "founder", "educational", "bold"]).default("founder"),
  contentTypes: z
    .array(z.enum(["newsletter", "linkedin", "shortScripts"]))
    .min(1, "Choose at least one output type.")
    .default(["newsletter", "linkedin", "shortScripts"]),
  transcript: z.string().max(40000).optional()
});

export type ProcessRequestInput = z.infer<typeof processRequestSchema>;

export async function processYouTubeContent(input: ProcessRequestInput): Promise<ProcessingResult> {
  const request = processRequestSchema.parse(input);
  const warnings: string[] = [];
  const video = parseYouTubeUrl(request.url);
  const metadata = await fetchYouTubeMetadata(video);

  if (!process.env.YOUTUBE_API_KEY) {
    warnings.push("YOUTUBE_API_KEY is not configured, so metadata and duration use safe fallbacks.");
  }

  if (!request.transcript?.trim()) {
    warnings.push("No transcript was provided. Generated drafts use a conservative source-informed template.");
  }

  const plan = buildContentPlan(metadata.durationSeconds, request.transcript);
  const outputs = await generateOutputs({
    sourceTitle: metadata.title,
    channel: metadata.channel,
    transcript: request.transcript,
    plan,
    request
  });

  return {
    jobId: crypto.randomUUID(),
    status: "completed",
    source: {
      videoId: video.id,
      url: video.canonicalUrl,
      title: metadata.title,
      channel: metadata.channel,
      durationSeconds: metadata.durationSeconds,
      thumbnailUrl: metadata.thumbnailUrl
    },
    plan,
    outputs,
    warnings
  };
}
