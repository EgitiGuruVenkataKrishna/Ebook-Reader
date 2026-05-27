import { NextResponse } from "next/server";
import { findJob } from "@/lib/jobs/store";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = findJob(id);

  if (!job) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "Job not found.",
          recovery: "In production this should be backed by Postgres rather than the development memory store."
        }
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, job });
}
