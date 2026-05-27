import { NextResponse } from "next/server";
import { z } from "zod";
import { listBooks, saveBookUpload } from "@/lib/ebook/storage";

export const runtime = "nodejs";

const emailSchema = z.string().trim().email();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = emailSchema.parse(searchParams.get("email"));
    const books = await listBooks(email);

    return NextResponse.json({ ok: true, books });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load books.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = emailSchema.parse(formData.get("email"));
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("Please choose a PDF or EPUB file.");
    }

    const book = await saveBookUpload(email, file);

    return NextResponse.json({ ok: true, book }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
