// app/api/recovery/autopilot-queue/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.recoveryFinding.findMany({
    where: { handled: false, autopilotQueued: true },
    orderBy: [{ valueCents: "desc" }, { autopilotQueuedAt: "asc" }, { createdAt: "asc" }],
    take: 200,
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      description: true,
      action: true,
      valueCents: true,
      createdAt: true,
      autopilotQueuedAt: true,
    },
  });

  const totalValueCents = items.reduce((acc, x) => acc + (x.valueCents ?? 0), 0);

  return NextResponse.json({ ok: true, count: items.length, totalValueCents, items });
}
