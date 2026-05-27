import { describe, expect, it } from "vitest";
import { buildContentPlan, estimateDurationSeconds } from "@/lib/content/planner";

describe("estimateDurationSeconds", () => {
  it("uses provider duration when present", () => {
    expect(estimateDurationSeconds(600, "one two three")).toBe(600);
  });

  it("estimates from transcript when duration is missing", () => {
    expect(estimateDurationSeconds(null, Array.from({ length: 290 }, () => "word").join(" "))).toBe(180);
  });
});

describe("buildContentPlan", () => {
  it("creates a compact set for short videos", () => {
    expect(buildContentPlan(240)).toMatchObject({
      newsletterIssues: 1,
      linkedinPosts: 1,
      shortScripts: 1
    });
  });

  it("creates a campaign for long videos", () => {
    expect(buildContentPlan(3700)).toMatchObject({
      newsletterIssues: 4,
      linkedinPosts: 12,
      shortScripts: 16
    });
  });
});
