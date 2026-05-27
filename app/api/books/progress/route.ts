import { NextResponse } from "next/server";
import { z } from "zod";
import { updateBookProgress } from "@/lib/ebook/storage";

export const runtime = "nodejs";

const progressSchema = z.object({
  email: z.string().trim().email(),
  bookId: z.string().min(1),
  currentPage: z.number().int().min(0)
});

export async function POST(request: Request) {
  try {
    const payload = progressSchema.parse(await request.json());
    const book = await updateBookProgress(payload.email, payload.bookId, payload.currentPage);

    return NextResponse.json({ ok: true, book });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save reading progress.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
