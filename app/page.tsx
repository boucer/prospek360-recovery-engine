// app/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

const CONTAINER = "mx-auto w-full max-w-[1500px] px-6 lg:px-8";

export default function HomePage() {
  const openAppHref = "/login?callbackUrl=%2Frecovery";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className={`${CONTAINER} py-10 space-y-10`}>
        {/* HERO */}
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                Prospek 360 — Recovery Engine
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-300/80 max-w-2xl">
                Un outil de décision :{" "}
                <span className="text-white/90 font-semibold">
                  quoi faire maintenant
                </span>{" "}
                pour récupérer plus d’argent, plus vite.
              </p>
            </div>

            <Link
              href={openAppHref}
              className="hidden md:inline-flex items-center justify-center rounded-xl bg-[#c33541] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Ouvrir l’app
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap gap-3">
            <Link
              href={openAppHref}
              className="inline-flex md:hidden items-center justify-center rounded-xl bg-[#c33541] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Ouvrir l’app (connexion)
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Se connecter
            </Link>

            <Link
              href="/audit/report"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-transparent px-5 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/5"
            >
              Exemple de rapport
            </Link>
          </div>

          <p className="text-xs text-white/45">
            Note : la vente + onboarding se fait via GHL. Cette page est un point
            d’entrée produit.
          </p>
        </header>

        {/* QUICK FLOW */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card
            title="1) Audit"
            badge="✅ V1"
            desc="Détecte & priorise les opportunités de recovery (high intent, no reply, etc.)."
          />
          <Card
            title="2) Exécution guidée"
            badge="✅ V1"
            desc="Copie le bon message, marque traité, continue. Simple, rapide, traçable."
          />
          <Card
            title="3) Auto-Pilot (assisté)"
            badge="✅ V1"
            desc="Enchaîne les actions simples avec garde-fous. Toujours réversible."
          />
        </section>

        {/* MODULES */}
        <section className="rounded-2xl border border-white/10 bg-slate-950 p-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Modules</h2>
            <p className="text-sm text-slate-300/70">
              V1 est volontairement simple : décisions claires, exécution
              assistée, zéro confusion.
            </p>
          </div>

          <div className="pt-5 grid gap-3 md:grid-cols-4">
            <Link
              href="/login?callbackUrl=%2Faudit"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06]"
            >
              <div className="text-sm font-semibold text-white">Audit ✅</div>
              <div className="text-xs text-slate-300/70 pt-1">
                Détecter & prioriser les opportunités.
              </div>
            </Link>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-70">
              <div className="text-sm font-semibold text-white">
                Activation ⏳
              </div>
              <div className="text-xs text-slate-300/70 pt-1">
                Séquences & automation (V2).
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-70">
              <div className="text-sm font-semibold text-white">Inbox ⏳</div>
              <div className="text-xs text-slate-300/70 pt-1">
                Réponses + tri + prochaines actions (V2).
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-70">
              <div className="text-sm font-semibold text-white">
                Paiement ⏳
              </div>
              <div className="text-xs text-slate-300/70 pt-1">
                Encaissement & relances (V2).
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={openAppHref}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ouvrir l’app →
            </Link>
            <Link
              href="/login?callbackUrl=%2Faudit"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/5"
            >
              Aller à Audit →
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="pt-2 text-xs text-white/45">
          Déjà client ?{" "}
          <Link href={openAppHref} className="text-white/80 hover:text-white underline">
            Connexion + ouvrir l’app
          </Link>
          .
        </footer>
      </div>
    </main>
  );
}

function Card({
  title,
  desc,
  badge,
}: {
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        {badge ? (
          <div className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="pt-2 text-sm text-slate-300/70">{desc}</div>
    </div>
  );
}
