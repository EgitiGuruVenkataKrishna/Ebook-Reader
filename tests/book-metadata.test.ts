import { describe, expect, it } from "vitest";
import {
  inferFormat,
  inferTitle,
  normalizeEmail,
  resolveReadModeGuide
} from "../lib/ebook/book-metadata";

describe("book metadata helpers", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail(" Reader@Example.com ")).toBe("reader@example.com");
  });

  it("infers epub format from file name", () => {
    expect(inferFormat("my-book.epub", "")).toBe("epub");
  });

  it("falls back to pdf for non-epub uploads", () => {
    expect(inferFormat("report.pdf", "application/pdf")).toBe("pdf");
  });

  it("creates human readable titles from file names", () => {
    expect(inferTitle("deep_work-final_copy.epub")).toBe("deep work final copy");
  });
});

describe("read mode guide", () => {
  it("returns windows-specific focus instructions", () => {
    const guide = resolveReadModeGuide("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    expect(guide.label).toBe("Windows");
    expect(guide.title).toMatch(/Focus on Windows/);
  });

  it("returns a generic guide for unknown devices", () => {
    const guide = resolveReadModeGuide("Custom Device");

    expect(guide.label).toBe("your device");
    expect(guide.steps[0]).toMatch(/quick settings|control center/i);
  });
});
