// app/audit/report/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PrintReportButton from "@/components/audit/PrintReportButton";

function money(cents?: number | null) {
  const v = Math.round((cents ?? 0) / 100);
  return `${v.toLocaleString("fr-CA")} $`;
}

export default async function AuditLastReportPage() {
  const lastRun = await prisma.auditRun.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  if (!lastRun) {
    return (
      <main className="p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dernier rapport</h1>
          <Link
            href="/audit"
            className="text-sm text-slate-700 underline underline-offset-4"
          >
            Retour à l’audit
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-slate-700">
            Aucun rapport disponible pour l’instant. Lance un audit pour générer
            un premier rapport.
          </p>
        </div>
      </main>
    );
  }

  const findings = await prisma.recoveryFinding.findMany({
    where: { auditRunId: lastRun.id },
    orderBy: [{ severity: "desc" }, { valueCents: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      action: true,
      severity: true,
      handled: true,
      handledAt: true,
      valueCents: true,
      createdAt: true,
    },
  });

  const total = findings.length;
  const treated = findings.filter((f) => f.handled).length;
  const potential = findings.reduce(
    (acc, f) => acc + (f.handled ? 0 : f.valueCents ?? 0),
    0
  );
  const recovered = findings.reduce(
    (acc, f) => acc + (f.handled ? f.valueCents ?? 0 : 0),
    0
  );

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Dernier rapport</h1>
          <p className="text-sm text-slate-600">
            Généré le{" "}
            {new Date(lastRun.createdAt).toLocaleString("fr-CA", {
              year: "numeric",
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Client component (window.print) */}
          <PrintReportButton />

          <Link
            href="/audit"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Retour à l’audit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Opportunités</div>
          <div className="text-2xl font-semibold">{total}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Traitées</div>
          <div className="text-2xl font-semibold">{treated}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Potentiel restant</div>
          <div className="text-2xl font-semibold">{money(potential)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Récupéré</div>
          <div className="text-2xl font-semibold">{money(recovered)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold">Détails</div>
          <div className="text-xs text-slate-500">
            Trié par priorité (sévérité), puis valeur.
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {findings.map((f) => (
            <div key={f.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.handled
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {f.handled ? "Traité" : "À traiter"}
                    </span>

                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {f.type}
                    </span>

                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      Sévérité {f.severity}
                    </span>
                  </div>

                  <div className="mt-1 font-semibold">{f.title}</div>

                  {f.description ? (
                    <div className="mt-1 text-sm text-slate-600">
                      {f.description}
                    </div>
                  ) : null}

                  {f.action ? (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Reco :</span>{" "}
                      <span className="text-slate-700">{f.action}</span>
                    </div>
                  ) : null}
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500">Valeur</div>
                  <div className="text-lg font-semibold">
                    {money(f.valueCents)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {findings.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-600">
              Aucune opportunité dans ce rapport.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
