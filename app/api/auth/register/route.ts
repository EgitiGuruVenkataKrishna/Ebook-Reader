import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser } from "@/lib/ebook/storage";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await request.json());
    const user = await registerUser(payload.email, payload.password);

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
