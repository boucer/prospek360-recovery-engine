// app/activation/inbox/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

function getNext(sp?: { next?: string }) {
  const raw = sp?.next || "/audit";
  // sécurité: empêche open-redirect externe
  if (raw.startsWith("http://") || raw.startsWith("https://")) return "/audit";
  return raw;
}

export default async function ActivationInboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const next = getNext(sp);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-red-500/35 bg-white/5 p-6 shadow-sm">
          <p className="text-xs text-slate-300/70">Activation</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Connecter l’Inbox
          </h1>
          <p className="mt-2 text-sm text-slate-300/80 leading-relaxed">
            Pour exécuter les actions de recovery (relance, réponse, automatisation),
            tu dois connecter l’Inbox.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold">Ce que ça débloque</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-300/80 space-y-1">
              <li>Relances rapides (email/SMS)</li>
              <li>Actions “Marquer comme traité” cohérentes</li>
              <li>Automations Recovery (V1 → V2)</li>
            </ul>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {/* TODO: brancher ton vrai flow de connexion Inbox */}
            <Link
              href={next}
              className="inline-flex items-center justify-center rounded-2xl border border-red-500/35 bg-red-500/12 px-4 py-3 text-sm font-semibold hover:bg-red-500/18 transition"
            >
              ✅ Simuler “connecté” → Retour
            </Link>

            <Link
              href="/recovery/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10 transition"
            >
              ← Dashboard
            </Link>
          </div>

          <p className="mt-4 text-[11px] text-slate-300/60">
            Retour automatique après activation : <span className="font-semibold text-slate-200">{next}</span>
          </p>
        </div>
      </div>
    </main>
  );
}
