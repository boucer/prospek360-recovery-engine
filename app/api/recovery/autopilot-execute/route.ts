// app/api/recovery/autopilot-execute/route.ts
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

  // On ne doit exécuter que des items en file et non handled
  const rows = await prisma.recoveryFinding.findMany({
    where: { id: { in: ids }, handled: false, autopilotQueued: true },
    select: { id: true, valueCents: true },
  });

  if (!rows.length) {
    return NextResponse.json({ ok: false, message: "Aucun item exécutable trouvé (déjà traité ou pas en file)." }, { status: 400 });
  }

  const now = new Date();
  const realIds = rows.map((r) => r.id);
  const totalValueCents = rows.reduce((acc, r) => acc + (r.valueCents ?? 0), 0);

  await prisma.recoveryFinding.updateMany({
    where: { id: { in: realIds } },
    data: {
      handled: true,
      handledAt: now,
      autopilotQueued: false,
      autopilotQueuedAt: null,
    },
  });

  return NextResponse.json({
    ok: true,
    handled: realIds.length,
    totalValueCents,
    ids: realIds,
    message: `Exécuté: ${realIds.length}`,
  });
}
