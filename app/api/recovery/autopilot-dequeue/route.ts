// app/api/recovery/autopilot-dequeue/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Body = { ids: string[] };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const ids = body?.ids?.filter(Boolean) ?? [];

  if (!ids.length) {
    return NextResponse.json({ ok: false, message: "Aucun id fourni." }, { status: 400 });
  }

  // On retire uniquement si c'est en file et pas handled
  const rows = await prisma.recoveryFinding.findMany({
    where: { id: { in: ids }, handled: false, autopilotQueued: true },
    select: { id: true },
  });

  const realIds = rows.map((r) => r.id);

  if (!realIds.length) {
    return NextResponse.json({ ok: false, message: "Aucun item retiré (pas en file ou déjà traité)." }, { status: 400 });
  }

  await prisma.recoveryFinding.updateMany({
    where: { id: { in: realIds } },
    data: { autopilotQueued: false, autopilotQueuedAt: null },
  });

  return NextResponse.json({ ok: true, updated: realIds.length, ids: realIds });
}
