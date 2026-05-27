import { describe, expect, it } from "vitest";
import { processYouTubeContent } from "@/lib/content/processor";

describe("processYouTubeContent", () => {
  it("returns structured content and warnings without provider keys", async () => {
    const result = await processYouTubeContent({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      audience: "SaaS founders",
      tone: "founder",
      contentTypes: ["newsletter", "linkedin"],
      transcript:
        "A content system works better when teams separate source ideas from distribution formats. The original video gives operators raw material for newsletters, social posts, and scripts."
    });

    expect(result.status).toBe("completed");
    expect(result.outputs.length).toBeGreaterThan(1);
    expect(result.warnings).toContain("YOUTUBE_API_KEY is not configured, so metadata and duration use safe fallbacks.");
  });
});
