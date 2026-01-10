// app/rapport-exemple/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

const CONTAINER = "mx-auto w-full max-w-[1500px] px-6 lg:px-8";

export default function ExempleRapportPage() {
  const openAppHref = "/login?callbackUrl=%2Frecovery";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className={`${CONTAINER} py-10 space-y-8`}>
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Exemple de rapport
            </h1>
            <p className="text-sm md:text-base text-slate-300/80 max-w-2xl">
              Un aperçu concret de ce que Recovery Engine produit :{" "}
              <span className="text-white/90 font-semibold">
                des décisions claires + des actions prêtes à exécuter
              </span>
              .
            </p>
            <p className="text-xs text-slate-400/70">
              Ceci est un exemple (démo). Le vrai rapport dépend de tes données.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              ← Accueil
            </Link>
            <Link
              href={openAppHref}
              className="inline-flex items-center justify-center rounded-xl bg-[#c33541] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Ouvrir l’app
            </Link>
          </div>
        </header>

        {/* Mini “rapport” */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card title="Score Recovery (V1)" badge="Démo">
            <div className="text-3xl font-semibold">72/100</div>
            <div className="mt-2 text-sm text-slate-300/80">
              Potentiel de récupération élevé sur 7 jours, surtout sur les “no reply”.
            </div>
          </Card>

          <Card title="Opportunités prioritaires" badge="Top 3">
            <ul className="space-y-2 text-sm text-slate-300/80">
              <li>• 14 leads “no reply” (72h+)</li>
              <li>• 6 “high intent” (visite + formulaire)</li>
              <li>• 4 suivis paiement / dépôt</li>
            </ul>
          </Card>

          <Card title="Prochaine meilleure action" badge="Action">
            <div className="text-sm text-slate-300/80">
              Envoyer le message #2 “Rappel court” aux no-reply 72h+.
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-200/80">
              “Petit suivi rapide — veux-tu que je te prépare ça aujourd’hui ou tu préfères
              qu’on se parle 5 minutes ?”
            </div>
          </Card>
        </section>

        {/* Liste items */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Décisions (exemple)</h2>
              <p className="text-sm text-slate-300/80">
                Chaque item vient avec un “quoi faire maintenant” + une exécution assistée.
              </p>
            </div>

            <span className="text-xs rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-200">
              ✅ V1
            </span>
          </div>

          <div className="grid gap-3">
            <Finding
              title="No reply — relance courte (72h+)"
              severity="Élevé"
              action="Copier message #2 → Envoyer → Marquer traité"
            />
            <Finding
              title="High intent — proposer 2 créneaux (aujourd’hui)"
              severity="Élevé"
              action="Copier message #1 → Envoyer → Marquer traité"
            />
            <Finding
              title="Devis envoyé — suivi simple (48h+)"
              severity="Moyen"
              action="Copier message #3 → Envoyer → Marquer traité"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={openAppHref}
              className="inline-flex items-center justify-center rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 border border-white/10"
            >
              Tester dans l’app →
            </Link>
            <Link
              href="/login?callbackUrl=%2Faudit"
              className="inline-flex items-center justify-center rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 border border-white/10"
            >
              Aller à Audit →
            </Link>
          </div>
        </section>

        <footer className="text-xs text-slate-400/70">
          © {new Date().getFullYear()} Prospek 360 — Engine Recovery
        </footer>
      </div>
    </main>
  );
}

function Card({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white/70">
          {badge}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Finding({
  title,
  severity,
  action,
}: {
  title: string;
  severity: "Élevé" | "Moyen" | "Faible";
  action: string;
}) {
  const sev =
    severity === "Élevé"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : severity === "Moyen"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
      : "border-white/10 bg-white/5 text-white/70";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-slate-300/80">{action}</div>
        </div>
        <span className={`shrink-0 text-xs rounded-lg border px-2 py-1 ${sev}`}>
          {severity}
        </span>
      </div>
    </div>
  );
}
