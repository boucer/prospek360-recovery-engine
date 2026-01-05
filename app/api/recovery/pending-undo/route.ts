// app/api/recovery/pending-undo/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const UNDO_WINDOW_MS = 5 * 60 * 1000;

export async function GET() {
  const since = new Date(Date.now() - UNDO_WINDOW_MS);

  const rows = await prisma.recoveryFinding.findMany({
    where: {
      handled: true,
      handledAt: { gte: since },
    },
    orderBy: { handledAt: "desc" },
    take: 25,
    select: {
      id: true,
      title: true,
      type: true,
      description: true,
      severity: true,
      valueCents: true,
      handledAt: true,
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      findingId: r.id,
      title: r.title,
      type: r.type,
      description: r.description,
      severity: r.severity,
      valueCents: r.valueCents,
      handledAtISO: r.handledAt ? r.handledAt.toISOString() : null,
    })),
  });
}
