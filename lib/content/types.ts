export type ContentType = "newsletter" | "linkedin" | "shortScripts";

export type Tone = "executive" | "founder" | "educational" | "bold";

export type ProcessingRequest = {
  url: string;
  audience: string;
  tone: Tone;
  contentTypes: ContentType[];
  transcript?: string;
};

export type ContentPlan = {
  estimatedDurationSeconds: number;
  newsletterIssues: number;
  linkedinPosts: number;
  shortScripts: number;
  rationale: string;
};

export type GeneratedOutput = {
  id: string;
  type: ContentType;
  title: string;
  body: string;
  readingTimeMinutes?: number;
};

export type ProcessingResult = {
  jobId: string;
  status: "completed";
  source: {
    videoId: string;
    url: string;
    title: string;
    channel: string;
    durationSeconds: number | null;
    thumbnailUrl: string;
  };
  plan: ContentPlan;
  outputs: GeneratedOutput[];
  warnings: string[];
};
