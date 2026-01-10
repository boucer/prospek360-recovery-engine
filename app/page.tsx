// app/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const CONTAINER = "mx-auto w-full max-w-[1500px] px-6 lg:px-8";

async function hasNextAuthSessionCookie() {
  // ✅ Next 16: cookies() est async
  const jar = await cookies();

  // ✅ Seule preuve fiable d'une session NextAuth
  const devToken = jar.get("next-auth.session-token")?.value;
  const secureToken = jar.get("__Secure-next-auth.session-token")?.value;

  return Boolean(devToken || secureToken);
}

export default async function HomePage() {
  // ✅ Si session => on skip la landing et on retourne dans l’app
  if (await hasNextAuthSessionCookie()) {
    redirect("/recovery"); // (ou "/audit" si tu préfères)
  }

  // ✅ Landing (non connecté)
  const openAppHref = "/login?callbackUrl=%2Frecovery";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className={`${CONTAINER} py-10 space-y-10`}>
        {/* HERO */}
        <header className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                Prospek 360 — Recovery Engine
              </h1>
              <p className="text-sm md:text-base text-slate-300/80 max-w-2xl">
                Un outil de décision :{" "}
                <span className="text-white/90 font-semibold">quoi faire maintenant</span>{" "}
                pour récupérer plus d’argent, plus vite.
              </p>
              <p className="text-xs text-slate-400/70">
                Accès sécurisé à l’application. L’activation complète se fait après connexion.
              </p>
            </div>

            <Link
              href={openAppHref}
              className="hidden md:inline-flex items-center justify-center rounded-xl bg-[#c33541] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Ouvrir l’app
            </Link>
          </div>

          <div className="flex gap-3">
            <Link
              href="/login?callbackUrl=%2Frecovery"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Se connecter
            </Link>
            <Link
              href="/rapport-exemple"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Exemple de rapport
            </Link>

            <Link
              href={openAppHref}
              className="ml-auto md:hidden inline-flex items-center justify-center rounded-xl bg-[#c33541] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Ouvrir l’app
            </Link>
          </div>
        </header>

        {/* 3 BLOCS */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">1) Audit</h3>
              <span className="text-xs rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                ✅ V1
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300/80">
              Détecte & priorise les opportunités de recovery (high intent, no reply, etc.).
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">2) Exécution guidée</h3>
              <span className="text-xs rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                ✅ V1
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300/80">
              Copie le bon message, marque traité, continue. Simple, rapide, traçable.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">3) Auto-Pilot (assisté)</h3>
              <span className="text-xs rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                ✅ V1
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300/80">
              Enchaîne les actions simples avec garde-fous. Toujours réversible.
            </p>
          </div>
        </section>

        {/* MODULES */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Modules</h2>
            <p className="text-sm text-slate-300/80">
              V1 est volontairement simple : décisions claires, exécution assistée, zéro confusion.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="font-semibold">Audit ✅</div>
              <div className="text-sm text-slate-300/80">Détecter & prioriser les opportunités.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="font-semibold">Activation ⏳</div>
              <div className="text-sm text-slate-300/80">Séquences & automation (V2).</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="font-semibold">Inbox ⏳</div>
              <div className="text-sm text-slate-300/80">Réponses + tri + prochaines actions (V2).</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="font-semibold">Paiement ⏳</div>
              <div className="text-sm text-slate-300/80">Encaissement & relances (V2).</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={openAppHref}
              className="inline-flex items-center justify-center rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 border border-white/10"
            >
              Ouvrir l’app →
            </Link>
            <Link
              href="/audit"
              className="inline-flex items-center justify-center rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 border border-white/10"
            >
              Aller à Audit →
            </Link>
          </div>

          <div className="pt-2 text-xs text-slate-400/70">
            Déjà client ?{" "}
            <Link className="underline text-slate-200/80" href={openAppHref}>
              Connexion + ouvrir l’app
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
