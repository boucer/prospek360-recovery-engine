import type { RecoveryFinding } from "@prisma/client";
import RecoveryFindingActions from "@/components/audit/RecoveryFindingActions";

function formatCADCompact(cents: number) {
  const dollars = (cents ?? 0) / 100;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

function severityLabel(n: number) {
  if (n >= 5) return "Très élevé";
  if (n === 4) return "Élevé";
  if (n === 3) return "Moyen";
  if (n === 2) return "Faible";
  return "Très faible";
}

export default function RecoveryFindingsTable({
  findings,
  highlightFindingId,
  highlightType,
  onMarkAsHandled,
}: {
  findings: RecoveryFinding[];
  highlightFindingId?: string | null;
  highlightType?: string | null;
  onMarkAsHandled?: (finding: RecoveryFinding) => void;
}) {
  const isEmpty = !findings || findings.length === 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm">
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur">
            <tr>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300/80">
                Priorité
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300/80">
                Type
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300/80">
                Détail
              </th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-300/80">
                Valeur
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300/80">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={5} className="py-14 text-center text-slate-300">
                  Aucune opportunité détectée.
                </td>
              </tr>
            ) : (
              findings.map((f: any, idx) => {
                const isPriority =
                  !f.handled &&
                  ((highlightFindingId && f.id === highlightFindingId) ||
                    (highlightType && f.type === highlightType));

                const zebra = idx % 2 === 0 ? "bg-slate-950/15" : "bg-slate-950/5";

                return (
                  <tr
                    key={f.id}
                    className={[
                      "border-t border-white/10",
                      zebra,
                      "hover:bg-white/5",
                      isPriority
                        ? "bg-red-500/10 border-l-[5px] border-l-red-500"
                        : "border-l-[5px] border-l-transparent",
                    ].join(" ")}
                  >
                    <td className="p-3 text-slate-100">
                      {severityLabel(Number(f.severity ?? 0))}
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-100">{f.title}</div>
                      <div className="text-xs text-slate-300/60">{f.type}</div>
                    </td>

                    <td className="p-3 text-slate-300">
                      <div className="whitespace-normal break-words">
                        {f.description}
                      </div>
                      <div className="mt-1 text-xs">
                        Recommandation : <b>{f.action}</b>
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <div className="font-semibold text-slate-100">
                        {formatCADCompact(f.valueCents ?? 0)}
                      </div>
                    </td>

                    <td className="p-3">
                      <RecoveryFindingActions
                        action={f.action}
                        handled={Boolean(f.handled)}
                        valueCents={f.valueCents ?? 0}
                        onMarkHandled={() => onMarkAsHandled?.(f)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
