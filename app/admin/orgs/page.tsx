import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import Link from "next/link";

export default async function AdminOrgsPage() {
  await requireAdmin("/admin/orgs");

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Organizations</h1>
            <p className="mt-1 text-sm text-white/70">
              Vue interne (V1). Champs avancés à ajouter quand le schema sera prêt.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            ← Admin
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-5 py-3 text-sm font-semibold text-white/80">
            {orgs.length} org(s)
          </div>

          <div className="divide-y divide-white/10">
            {orgs.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="font-semibold">{o.name}</div>
                  <div className="mt-1 text-xs text-white/60">
                    id: {o.id}
                  </div>
                </div>
                <div className="text-xs text-white/60">
                  {new Date(o.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {orgs.length === 0 && (
              <div className="px-5 py-10 text-center text-white/60">
                Aucune organisation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
