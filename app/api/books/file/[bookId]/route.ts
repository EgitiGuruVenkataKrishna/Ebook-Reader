import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookFile } from "@/lib/ebook/storage";

export const runtime = "nodejs";

const emailSchema = z.string().trim().email();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const email = emailSchema.parse(searchParams.get("email"));
    const { book, bytes } = await getBookFile(email, resolvedParams.bookId);

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": book.mimeType,
        "Content-Disposition": `inline; filename="${book.fileName}"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the selected book.";

    return NextResponse.json({ ok: false, error: message }, { status: 404 });
  }
}
