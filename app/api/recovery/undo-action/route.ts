// app/api/recovery/undo-action/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const findingId = body?.findingId as string | undefined;

  if (!findingId) {
    return NextResponse.json({ ok: false, error: "missing findingId" }, { status: 400 });
  }

  await prisma.recoveryFinding.update({
    where: { id: findingId },
    data: {
      handled: false,
      handledAt: null,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
