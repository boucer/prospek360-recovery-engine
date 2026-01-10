import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runRecoveryEngine } from "@/lib/recoveryEngine";

const RECENTLY_HANDLED_WINDOW_HOURS = 24;

export async function POST() {
  try {
    // 1) Crée un nouveau AuditRun (inchangé)
    const auditRun = await prisma.auditRun.create({
      data: {
        status: "SUCCESS",
        message: "Audit recovery exécuté",
      },
    });

    // 2) Récupère les types traités récemment (pour éviter de re-proposer la même chose)
    const since = new Date(Date.now() - RECENTLY_HANDLED_WINDOW_HOURS * 60 * 60 * 1000);

    const recentlyHandled = await prisma.recoveryFinding.findMany({
      where: {
        handled: true,
        handledAt: { gte: since },
      },
      select: { type: true },
    });

    const handledTypes = new Set(recentlyHandled.map((f) => f.type));

    // 3) Calcule les nouveaux findings via l’engine (inchangé)
    const findings = runRecoveryEngine();

    // 4) Création des findings, mais:
    //    - si un type a été traité dans les dernières 24h → créer "handled: true"
    if (findings.length) {
      const now = new Date();

      await prisma.recoveryFinding.createMany({
        data: findings.map((f) => {
          const autoHandled = handledTypes.has(f.type);

          return {
            auditRunId: auditRun.id,
            type: f.type,
            title: f.title,
            description: f.description,
            action: f.action,
            severity: f.severity,
            valueCents: f.valueCents,

            // ✅ clé : ne pas re-proposer immédiatement ce qui vient d’être traité
            handled: autoHandled,
            handledAt: autoHandled ? now : null,
          };
        }),
      });
    }

    return NextResponse.json({
      ok: true,
      auditRunId: auditRun.id,
      findingsCount: findings.length,
      dedupeWindowHours: RECENTLY_HANDLED_WINDOW_HOURS,
    });
  } catch (error) {
    console.error("Recovery audit error:", error);
    return NextResponse.json(
      { ok: false, error: "Recovery audit failed" },
      { status: 500 }
    );
  }
}
