import type { ReaderFormat } from "@/lib/ebook/types";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function inferFormat(fileName: string, mimeType: string): ReaderFormat {
  if (mimeType === "application/epub+zip" || fileName.toLowerCase().endsWith(".epub")) {
    return "epub";
  }

  return "pdf";
}

export function inferTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled Book";
}

export function resolveReadModeGuide(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (ua.includes("windows")) {
    return {
      label: "Windows",
      title: "Turn on Focus on Windows",
      steps: [
        "Open the Notification Center from the taskbar.",
        "Turn on Focus or Do Not Disturb before returning to the book.",
        "Keep reading here while the app stays fullscreen and the screen stays awake."
      ]
    };
  }

  if (ua.includes("android")) {
    return {
      label: "Android",
      title: "Turn on Do Not Disturb on Android",
      steps: [
        "Swipe down from the top of your phone to open Quick Settings.",
        "Tap Do Not Disturb or Bedtime mode.",
        "Return to the book and continue reading in fullscreen."
      ]
    };
  }

  if (ua.includes("iphone") || ua.includes("ipad")) {
    return {
      label: "iPhone or iPad",
      title: "Turn on Focus on iPhone or iPad",
      steps: [
        "Open Control Center.",
        "Tap Focus and choose Do Not Disturb or Reading.",
        "Come back to the app to continue in your quiet reading mode."
      ]
    };
  }

  if (ua.includes("mac os")) {
    return {
      label: "macOS",
      title: "Turn on Focus on macOS",
      steps: [
        "Open Control Center from the menu bar.",
        "Choose Focus, then enable Do Not Disturb or Reading.",
        "Return to the book once your Mac is quiet."
      ]
    };
  }

  return {
    label: "your device",
    title: "Turn on your device's quiet mode",
    steps: [
      "Open your device's quick settings, control center, or notification panel.",
      "Enable Do Not Disturb, Focus, Bedtime, or another quiet mode.",
      "Return here to keep reading in fullscreen."
    ]
  };
}
