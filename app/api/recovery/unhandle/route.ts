// app/api/autopilot/unhandle/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = body?.id as string | undefined;
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    await prisma.recoveryFinding.update({
      where: { id },
      data: { handled: false, handledAt: null },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "unhandle_failed" }, { status: 500 });
  }
}
