"use client";

// components/audit/ActivityTimeline.tsx
import Link from "next/link";
import { useMemo, useState } from "react";

type AuditRunLite = {
  id: string;
  status?: string | null;
  message?: string | null;
  createdAt: Date | string;
};

type FindingLite = {
  id: string;
  title?: string | null;
  type?: string | null;
  severity?: number | null;
  valueCents?: number | null;
  createdAt?: Date | string | null;
  handledAt?: Date | string | null;
  autopilotQueuedAt?: Date | string | null;
};

type ActivityItem = {
  kind: "AUDIT" | "DETECTED" | "AUTOPILOT" | "HANDLED";
  at: Date;
  title: string;
  subtitle?: string;
  badge: string;
  tone: "neutral" | "good" | "warn";
  valueCents?: number;
};

function asDate(d?: Date | string | null) {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
}

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatCAD(cents?: number | null) {
  if (!cents) return null;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function badgeClasses(tone: ActivityItem["tone"]) {
  if (tone === "good") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  if (tone === "warn") return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  return "border-white/10 bg-white/5 text-white/70";
}

export default function ActivityTimeline({
  runs,
  findings,
  showLinks = true,
}: {
  runs?: AuditRunLite[] | null;
  findings?: FindingLite[] | null;
  showLinks?: boolean;
}) {
  const items = useMemo<ActivityItem[]>(() => {
    const out: ActivityItem[] = [];

    (runs ?? []).forEach((r) => {
      const at = asDate(r.createdAt);
      if (!at) return;
      out.push({
        kind: "AUDIT",
        at,
        title: "🧠 Audit exécuté",
        subtitle: r.message || "Analyse recovery complétée.",
        badge: "Audit",
        tone: "good",
      });
    });

    (findings ?? []).forEach((f) => {
      const title = f.title || "Opportunité détectée";
      const value = f.valueCents ?? undefined;

      const detectedAt = asDate(f.createdAt);
      if (detectedAt) {
        out.push({
          kind: "DETECTED",
          at: detectedAt,
          title: `🔍 Détecté : ${title}`,
          subtitle: f.severity ? `Priorité ${f.severity}` : undefined,
          badge: "Détecté",
          tone: "neutral",
          valueCents: value,
        });
      }

      const queuedAt = asDate(f.autopilotQueuedAt);
      if (queuedAt) {
        out.push({
          kind: "AUTOPILOT",
          at: queuedAt,
          title: `🤖 Mis en file Auto-Pilot : ${title}`,
          subtitle: "Action prête à enchaîner.",
          badge: "Auto-Pilot",
          tone: "warn",
          valueCents: value,
        });
      }

      const handledAt = asDate(f.handledAt);
      if (handledAt) {
        out.push({
          kind: "HANDLED",
          at: handledAt,
          title: `✅ Traité : ${title}`,
          subtitle: "Action complétée.",
          badge: "Traité",
          tone: "good",
          valueCents: value,
        });
      }
    });

    return out.sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [runs, findings]);

  const [expanded, setExpanded] = useState(false);
  const collapsedCount = 6;
  const visibleItems = expanded ? items : items.slice(0, collapsedCount);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-white">Activités récentes</div>
          <div className="text-xs text-slate-400">
            Audit, détections, Auto-Pilot et actions traitées.
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > collapsedCount && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              {expanded ? "Réduire" : "Voir plus"}
            </button>
          )}

          {showLinks && (
            <Link
              href="/audit/report"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Rapport →
            </Link>
          )}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="p-4 text-sm text-slate-400">
          Aucune activité récente pour le moment.
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {visibleItems.map((x, i) => (
            <div key={i} className="px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded-full border px-2 py-0.5 ${badgeClasses(x.tone)}`}>
                      {x.badge}
                    </span>
                    <span className="text-slate-400">{formatWhen(x.at)}</span>
                  </div>

                  <div className="mt-1 font-semibold text-white">{x.title}</div>
                  {x.subtitle && (
                    <div className="mt-1 text-sm text-slate-400">{x.subtitle}</div>
                  )}
                </div>

                {x.valueCents ? (
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Impact</div>
                    <div className="text-sm font-semibold text-white">
                      {formatCAD(x.valueCents)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {!expanded && items.length > collapsedCount && (
        <div className="border-t border-white/5 px-4 py-2 text-xs text-slate-400">
          +{items.length - collapsedCount} autres activités
        </div>
      )}
    </div>
  );
}
