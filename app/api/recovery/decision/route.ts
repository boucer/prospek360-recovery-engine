// app/api/recovery/decision/route.ts
import { prisma } from "@/lib/prisma";
import { computeDecisionV1 } from "@/lib/decisionEngine";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const findingId = url.searchParams.get("findingId");

    if (!findingId) {
      return Response.json({ ok: false, error: "missing findingId" }, { status: 400 });
    }

    const finding = await prisma.recoveryFinding.findUnique({
      where: { id: findingId },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        action: true,
        severity: true,
        valueCents: true,
        createdAt: true,
        handled: true,
        handledAt: true,
      },
    });

    if (!finding) {
      return Response.json({ ok: false, error: "not found" }, { status: 404 });
    }

    const ageDays = finding.createdAt
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(finding.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    const decision = computeDecisionV1({
      opportunity: finding as any,
      ageDays,
    });

    return Response.json({ ok: true, decision }, { status: 200 });
  } catch {
    return Response.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
