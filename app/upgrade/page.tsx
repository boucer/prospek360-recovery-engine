// app/upgrade/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

function getSafeNext(raw?: string) {
  const next = raw || "/audit";
  if (next.startsWith("http://") || next.startsWith("https://")) return "/audit";
  return next;
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; reason?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const next = getSafeNext(sp.next);
  const reason = sp.reason || "upgrade";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-red-500/35 bg-white/5 p-6 shadow-sm">
          <p className="text-xs text-slate-300/70">Prospek 360 Pro</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Débloquer les actions premium
          </h1>
          <p className="mt-2 text-sm text-slate-300/80 leading-relaxed">
            Certaines actions Recovery sont réservées au plan Pro (automations, actions avancées,
            priorisation intelligente).
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold">Pourquoi maintenant ?</p>
            <p className="mt-2 text-sm text-slate-300/80">
              Raison: <span className="font-semibold text-slate-200">{reason}</span>
            </p>
            <p className="mt-2 text-sm text-slate-300/80">
              Tu reviens automatiquement à :{" "}
              <span className="font-semibold text-slate-200">{next}</span>
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {/* TODO: brancher Stripe Checkout / Customer Portal */}
            <Link
              href={next}
              className="inline-flex items-center justify-center rounded-2xl border border-red-500/35 bg-red-500/12 px-4 py-3 text-sm font-semibold hover:bg-red-500/18 transition"
            >
              ✅ Simuler “abonné Pro” → Retour
            </Link>

            <Link
              href="/recovery/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10 transition"
            >
              ← Dashboard
            </Link>
          </div>

          <p className="mt-4 text-[11px] text-slate-300/60">
            Une fois Stripe branché, ce bouton déclenchera Checkout/Portal, puis retour via <code className="text-slate-200">next</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
