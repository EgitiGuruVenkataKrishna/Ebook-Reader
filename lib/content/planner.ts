import type { ContentPlan } from "./types";

const WORDS_PER_MINUTE = 145;

export function estimateDurationSeconds(durationSeconds: number | null, transcript?: string) {
  if (durationSeconds && durationSeconds > 0) return durationSeconds;

  const wordCount = transcript?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  if (wordCount > 0) {
    return Math.max(180, Math.round((wordCount / WORDS_PER_MINUTE) * 60));
  }

  return 12 * 60;
}

export function buildContentPlan(durationSeconds: number | null, transcript?: string): ContentPlan {
  const estimatedDurationSeconds = estimateDurationSeconds(durationSeconds, transcript);
  const minutes = estimatedDurationSeconds / 60;

  if (minutes <= 5) {
    return {
      estimatedDurationSeconds,
      newsletterIssues: 1,
      linkedinPosts: 1,
      shortScripts: 1,
      rationale: "Short source: preserve focus with one compact content set."
    };
  }

  if (minutes <= 20) {
    return {
      estimatedDurationSeconds,
      newsletterIssues: 1,
      linkedinPosts: 3,
      shortScripts: 4,
      rationale: "Standard source: one newsletter with several social angles."
    };
  }

  if (minutes <= 60) {
    return {
      estimatedDurationSeconds,
      newsletterIssues: 2,
      linkedinPosts: 6,
      shortScripts: 8,
      rationale: "Long source: split into a series so each idea has room."
    };
  }

  return {
    estimatedDurationSeconds,
    newsletterIssues: 4,
    linkedinPosts: 12,
    shortScripts: 16,
    rationale: "Deep source: package as a multi-part campaign."
  };
}
