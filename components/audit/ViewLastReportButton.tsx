import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ViewLastReportButton() {
  const lastRun = await prisma.auditRun.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const disabled = !lastRun?.id;

  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm transition";
  const enabled =
    "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10";
  const disabledCls =
    "border border-white/10 bg-white/5 text-slate-500 cursor-not-allowed";

  if (disabled) {
    return (
      <div className="flex flex-col gap-1">
        <button type="button" className={`${base} ${disabledCls}`} disabled>
          Dernier rapport
        </button>
        <span className="text-xs text-slate-500">
          Aucun audit disponible
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Link href="/audit/report" className={`${base} ${enabled}`}>
        Dernier rapport
      </Link>
      <span className="text-xs text-slate-400">
        Lecture / export
      </span>
    </div>
  );
}
