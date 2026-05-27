import type { ContentPlan, ContentType, GeneratedOutput, ProcessingRequest, Tone } from "./types";

type GenerateInputs = {
  sourceTitle: string;
  channel: string;
  transcript?: string;
  plan: ContentPlan;
  request: ProcessingRequest;
};

const toneMap: Record<Tone, string> = {
  executive: "clear, decisive, and boardroom-ready",
  founder: "direct, opinionated, and practical",
  educational: "calm, structured, and useful",
  bold: "sharp, memorable, and high-conviction"
};

export async function generateOutputs(input: GenerateInputs): Promise<GeneratedOutput[]> {
  const outputs: GeneratedOutput[] = [];

  if (input.request.contentTypes.includes("newsletter")) {
    outputs.push(...generateNewsletters(input));
  }

  if (input.request.contentTypes.includes("linkedin")) {
    outputs.push(...generateLinkedInPosts(input));
  }

  if (input.request.contentTypes.includes("shortScripts")) {
    outputs.push(...generateShortScripts(input));
  }

  return outputs;
}

function generateNewsletters(input: GenerateInputs): GeneratedOutput[] {
  return Array.from({ length: input.plan.newsletterIssues }, (_, index) => {
    const issue = index + 1;
    const focus = pickFocus(input.transcript, index);

    return {
      id: `newsletter-${issue}`,
      type: "newsletter" satisfies ContentType,
      title:
        input.plan.newsletterIssues > 1
          ? `Newsletter ${issue}: ${focus.heading}`
          : `Newsletter: ${input.sourceTitle}`,
      readingTimeMinutes: 4,
      body: [
        `Subject: ${focus.heading}`,
        "",
        `This issue turns "${input.sourceTitle}" from ${input.channel} into a practical briefing for ${input.request.audience}. The tone is ${toneMap[input.request.tone]}, with the source idea kept close to the original video.`,
        "",
        "Opening",
        focus.opening,
        "",
        "What matters",
        `- ${focus.pointOne}`,
        `- ${focus.pointTwo}`,
        `- ${focus.pointThree}`,
        "",
        "How to use it",
        "Turn the strongest claim into a concrete next step, add one example from your operating context, and close with a single action the reader can take this week.",
        "",
        "CTA",
        "Reply with the bottleneck you are trying to turn into reusable content, and I will map the next asset from it."
      ].join("\n")
    };
  });
}

function generateLinkedInPosts(input: GenerateInputs): GeneratedOutput[] {
  return Array.from({ length: input.plan.linkedinPosts }, (_, index) => {
    const focus = pickFocus(input.transcript, index);
    const number = index + 1;

    return {
      id: `linkedin-${number}`,
      type: "linkedin",
      title: `LinkedIn Post ${number}: ${focus.heading}`,
      body: [
        `${focus.hook}`,
        "",
        `${focus.pointOne}`,
        "",
        `${focus.pointTwo}`,
        "",
        "The useful move is not to summarize everything. It is to pick the one idea your audience can act on, then give it a clean frame.",
        "",
        `Question: where would ${input.request.audience} feel this most right now?`
      ].join("\n")
    };
  });
}

function generateShortScripts(input: GenerateInputs): GeneratedOutput[] {
  return Array.from({ length: input.plan.shortScripts }, (_, index) => {
    const focus = pickFocus(input.transcript, index);
    const number = index + 1;

    return {
      id: `script-${number}`,
      type: "shortScripts",
      title: `Short Script ${number}: ${focus.heading}`,
      body: [
        "HOOK",
        focus.hook,
        "",
        "SETUP",
        `Most people watching "${input.sourceTitle}" will remember the broad theme. The opportunity is to turn one specific insight into a useful decision.`,
        "",
        "VALUE",
        `${focus.pointOne} ${focus.pointTwo}`,
        "",
        "PAYOFF",
        focus.pointThree,
        "",
        "CTA",
        "Follow for more ways to turn long-form thinking into usable content systems."
      ].join("\n")
    };
  });
}

function pickFocus(transcript: string | undefined, seed: number) {
  const fallback = [
    "A strong content system starts by separating the source idea from the final format.",
    "Long-form video usually contains multiple usable angles, not one generic summary.",
    "The best short-form scripts keep one claim, one example, and one payoff.",
    "A newsletter should add structure and judgment, not simply compress the transcript."
  ];

  const sentences =
    transcript
      ?.replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 40) ?? [];

  const selected = sentences.length > 0 ? sentences[seed % sentences.length] : fallback[seed % fallback.length];
  const trimmed = selected.length > 220 ? `${selected.slice(0, 217)}...` : selected;

  return {
    heading: headlineFromSentence(trimmed),
    hook: `The overlooked idea: ${trimmed}`,
    opening: `The source material points to a simple but valuable shift: ${trimmed}`,
    pointOne: `Use the original video as raw strategic material, not as a transcript to flatten.`,
    pointTwo: `Package each major idea by audience, format, and desired action.`,
    pointThree: `A better content engine creates fewer generic summaries and more specific reusable assets.`
  };
}

function headlineFromSentence(sentence: string) {
  const cleaned = sentence
    .replace(/["']/g, "")
    .split(" ")
    .slice(0, 9)
    .join(" ");

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
