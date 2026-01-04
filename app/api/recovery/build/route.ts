// app/api/autopilot/build/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = typeof body?.limit === "number" ? Math.max(1, Math.min(body.limit, 50)) : 12;

    // Levier #1 = le type le plus fréquent dans les TODO
    const byType = await prisma.recoveryFinding.groupBy({
      by: ["type"],
      _count: { id: true },
      where: { handled: false },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    });

    const leverType = byType?.[0]?.type || "UNKNOWN";
    const leverCount = byType?.[0]?._count?.id || 0;

    // Prendre les meilleurs items de ce levier
    const rows = await prisma.recoveryFinding.findMany({
      where: { handled: false, type: leverType },
      select: { id: true },
      orderBy: [{ severity: "desc" }, { valueCents: "desc" }, { createdAt: "asc" }],
      take: limit,
    });

    const queueIds = rows.map((r) => r.id);

    return NextResponse.json({
      leverType,
      queueIds,
      rationale: leverCount > 0 ? `Levier #1 détecté : ${leverCount} items TODO.` : `Aucun TODO détecté (type fallback).`,
    });
  } catch (e) {
    return NextResponse.json({ error: "build_failed" }, { status: 500 });
  }
}
