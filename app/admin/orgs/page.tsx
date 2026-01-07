// app/admin/orgs/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium" }).format(dt);
  } catch {
    return dt.toISOString().slice(0, 10);
  }
}

export default async function AdminOrgsPage() {
  // ⚠️ ton requireAdmin() semble être "0 args". On ne passe RIEN.
  await requireAdmin();

  // ✅ SELECT ULTRA SAFE: seulement ce qui existe pratiquement toujours
  // Si ton modèle a d’autres champs, on les ajoutera ensuite.
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      // 👇 garde seulement si ces champs existent vraiment dans TON schema
      // ghlLocationId: true,
    },
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] px-6 lg:px-8 py-8 text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Clients</h1>
          <p className="mt-2 text-sm text-white/65">
            Liste des organisations (V1). On affiche seulement les champs disponibles pour éviter de casser le build.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            ← Admin
          </Link>

          <Link
            href="/admin/orgs/new"
            className="rounded-xl bg-[#c33541] px-4 py-2 text-sm font-extrabold text-white hover:brightness-110"
          >
            + Nouveau client
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-12 gap-0 border-b border-white/10 px-5 py-3 text-xs font-semibold text-white/60">
          <div className="col-span-6">Nom</div>
          <div className="col-span-3">Créé</div>
          <div className="col-span-3">MAJ</div>
        </div>

        {orgs.length === 0 ? (
          <div className="px-5 py-10 text-sm text-white/70">
            Aucun client encore. Clique “Nouveau client”.
          </div>
        ) : (
          orgs.map((o) => (
            <div
              key={o.id}
              className="grid grid-cols-12 gap-0 px-5 py-4 border-b border-white/5 hover:bg-white/5"
            >
              <div className="col-span-6">
                <div className="text-sm font-semibold text-white">{o.name}</div>
                <div className="mt-1 text-xs text-white/50">ID: {o.id}</div>
              </div>

              <div className="col-span-3 text-sm text-white/80">
                {fmtDate(o.createdAt)}
              </div>

              <div className="col-span-3 text-sm text-white/80">
                {fmtDate(o.updatedAt)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
        <p className="font-semibold text-white/75">Note</p>
        <p className="mt-1">
          Si tu veux afficher slug/logo/email/etc. il faut d’abord que ces champs existent dans `prisma/schema.prisma`
          (ou qu’on lise une autre table). Là on a “stabilisé le build” pour pouvoir push.
        </p>
      </div>
    </div>
  );
}
