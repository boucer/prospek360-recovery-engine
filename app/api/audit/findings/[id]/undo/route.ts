// app/api/audit/findings/[id]/undo/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const finding = await prisma.recoveryFinding.findUnique({
    where: { id },
  });

  if (!finding || !finding.handled || !finding.handledAt) {
    return NextResponse.json({ error: "Not undoable" }, { status: 400 });
  }

  const FIVE_MIN = 5 * 60 * 1000;
  const elapsed = Date.now() - new Date(finding.handledAt).getTime();

  if (elapsed > FIVE_MIN) {
    return NextResponse.json({ error: "Undo window expired" }, { status: 403 });
  }

  await prisma.recoveryFinding.update({
    where: { id },
    data: {
      handled: false,
      handledAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
