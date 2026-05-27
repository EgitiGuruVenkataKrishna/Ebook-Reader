import { describe, expect, it } from "vitest";
import { parseIsoDuration, parseYouTubeUrl } from "@/lib/youtube";

describe("parseYouTubeUrl", () => {
  it("parses watch URLs", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      id: "dQw4w9WgXcQ",
      canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    });
  });

  it("parses short URLs", () => {
    expect(parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?t=10").id).toBe("dQw4w9WgXcQ");
  });

  it("rejects unsupported URLs", () => {
    expect(() => parseYouTubeUrl("https://example.com/video")).toThrow(/YouTube/);
  });
});

describe("parseIsoDuration", () => {
  it("parses hours, minutes, and seconds", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
  });
});
