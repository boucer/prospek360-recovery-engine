// src/app/admin/page.tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";

export default async function AdminHome() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-[1500px] px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin — Prospek 360</h1>
            <p className="mt-1 text-sm text-white/70">
              Panneau interne (cookie). Aucun compte requis.
            </p>
          </div>

          <Link
            href="/admin/login"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Re-login
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/tenants"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06]"
          >
            <div className="text-sm font-semibold">Tenants</div>
            <div className="mt-1 text-sm text-white/70">
              Entreprises, branding, canaux.
            </div>
          </Link>

          <Link
            href="/admin/integrations"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06]"
          >
            <div className="text-sm font-semibold">Intégrations</div>
            <div className="mt-1 text-sm text-white/70">
              Clés GHL / templates / webhooks.
            </div>
          </Link>

          <Link
            href="/admin/templates"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06]"
          >
            <div className="text-sm font-semibold">Templates</div>
            <div className="mt-1 text-sm text-white/70">
              SMS / Email / scripts Auto-Pilot.
            </div>
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
          <div className="text-sm font-semibold">Prochaine étape V1</div>
          <div className="mt-1 text-sm text-white/80">
            Ajouter un tenant (logo + email + SMS) puis brancher GHL en “transport invisible”.
          </div>
        </div>
      </div>
    </div>
  );
}
