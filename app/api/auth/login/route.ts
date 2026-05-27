import { NextResponse } from "next/server";
import { z } from "zod";
import { loginUser } from "@/lib/ebook/storage";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await loginUser(payload.email, payload.password);

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
