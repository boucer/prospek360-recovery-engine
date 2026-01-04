import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runRecoveryEngine } from "@/lib/recoveryEngine";

export async function POST() {
  try {
    const auditRun = await prisma.auditRun.create({
      data: {
        status: "SUCCESS",
        message: "Audit recovery exécuté",
      },
    });

    const findings = runRecoveryEngine();

    if (findings.length) {
      await prisma.recoveryFinding.createMany({
        data: findings.map((f) => ({
          auditRunId: auditRun.id,
          type: f.type,
          title: f.title,
          description: f.description,
          action: f.action,
          severity: f.severity,
          valueCents: f.valueCents,
        })),
      });
    }

    return NextResponse.json({
      ok: true,
      auditRunId: auditRun.id,
      findingsCount: findings.length,
    });
  } catch (error) {
    console.error("Recovery audit error:", error);
    return NextResponse.json(
      { ok: false, error: "Recovery audit failed" },
      { status: 500 }
    );
  }
}
