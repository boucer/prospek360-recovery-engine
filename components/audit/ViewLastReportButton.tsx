import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ViewLastReportButton() {
  const lastRun = await prisma.auditRun.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const disabled = !lastRun?.id;

  // Même rendu que tes boutons actuels
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition";
  const enabled =
    "border border-slate-300 bg-white hover:bg-slate-50 text-slate-900";
  const disabledCls =
    "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed";

  if (disabled) {
    return (
      <button type="button" className={`${base} ${disabledCls}`} disabled>
        Voir le dernier rapport
      </button>
    );
  }

  return (
    <Link className={`${base} ${enabled}`} href="/audit/report">
      Voir le dernier rapport
    </Link>
  );
}
