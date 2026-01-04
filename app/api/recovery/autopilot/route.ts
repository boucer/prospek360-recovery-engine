// app/api/recovery/autopilot/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Body = {
  limit?: number; // nb max d'items à queue
  strategy?: "TOP_TYPE" | "TOP_VALUE";
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const limit = Math.max(1, Math.min(body.limit ?? 10, 50));
  const strategy = body.strategy ?? "TOP_TYPE";

  // Pool = items TODO non-queue
  const poolWhere = { handled: false, autopilotQueued: false };

  // Trouver le "levier"
  const byType = await prisma.recoveryFinding.groupBy({
    by: ["type"],
    where: poolWhere,
    _count: { id: true },
    _sum: { valueCents: true },
  });

  if (!byType.length) {
    return NextResponse.json(
      { ok: true, message: "Rien à lancer : aucun item disponible pour Auto-Pilot.", queued: 0 },
      { status: 200 }
    );
  }

  const sorted = [...byType].sort((a, b) => {
    const aCount = a._count.id ?? 0;
    const bCount = b._count.id ?? 0;
    const aSum = a._sum.valueCents ?? 0;
    const bSum = b._sum.valueCents ?? 0;

    if (strategy === "TOP_VALUE") {
      if (bSum !== aSum) return bSum - aSum;
      return bCount - aCount;
    }

    // TOP_TYPE
    if (bCount !== aCount) return bCount - aCount;
    return bSum - aSum;
  });

  const targetType = sorted[0].type;

  // Sélection des items à mettre en file
  const findings = await prisma.recoveryFinding.findMany({
    where: { ...poolWhere, type: targetType },
    orderBy: [{ valueCents: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true, valueCents: true, title: true, severity: true, createdAt: true },
  });

  if (!findings.length) {
    return NextResponse.json(
      { ok: true, message: "Aucun item à queue pour ce type.", queued: 0, targetType },
      { status: 200 }
    );
  }

  const now = new Date();

  // Mise en file (NE TOUCHE PAS handled)
  await prisma.recoveryFinding.updateMany({
    where: { id: { in: findings.map((f) => f.id) } },
    data: { autopilotQueued: true, autopilotQueuedAt: now },
  });

  const queuedValueCents = findings.reduce((acc, f) => acc + (f.valueCents ?? 0), 0);

  return NextResponse.json(
    {
      ok: true,
      targetType,
      queued: findings.length,
      queuedValueCents,
      ids: findings.map((f) => f.id),
      items: findings,
      message: `Auto-Pilot lancé : ${findings.length} items (${targetType}) mis en file.`,
    },
    { status: 200 }
  );
}
