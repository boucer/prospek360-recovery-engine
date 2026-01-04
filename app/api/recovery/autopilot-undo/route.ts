// app/api/recovery/autopilot-undo/route.ts
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

  // On undo uniquement ce qui a été handled=true (sinon ça devient n'importe quoi)
  const rows = await prisma.recoveryFinding.findMany({
    where: { id: { in: ids }, handled: true },
    select: { id: true },
  });

  if (!rows.length) {
    return NextResponse.json({ ok: false, message: "Aucun item à undo trouvé." }, { status: 400 });
  }

  const now = new Date();
  const realIds = rows.map((r) => r.id);

  await prisma.recoveryFinding.updateMany({
    where: { id: { in: realIds } },
    data: {
      handled: false,
      handledAt: null,
      autopilotQueued: true,
      autopilotQueuedAt: now,
    },
  });

  return NextResponse.json({
    ok: true,
    restored: realIds.length,
    ids: realIds,
    message: `Undo: ${realIds.length} restauré(s)`,
  });
}
