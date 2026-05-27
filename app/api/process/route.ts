import { NextResponse } from "next/server";
import { processRequestSchema, processYouTubeContent } from "@/lib/content/processor";
import { saveJob } from "@/lib/jobs/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = processRequestSchema.parse(json);
    const result = await processYouTubeContent(input);
    saveJob(result);

    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed unexpectedly.";

    return NextResponse.json(
      {
        ok: false,
        error: {
          message,
          recovery: "Check the YouTube URL and try again. If the source has no captions, paste transcript notes for now."
        }
      },
      { status: 400 }
    );
  }
}
