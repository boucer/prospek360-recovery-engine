// app/admin/orgs/page.tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export default async function AdminOrgsPage() {
  requireAdmin();

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      brandPrimary: true,
      emailFrom: true,
      smsFrom: true,
      timezone: true,
      createdAt: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-[1500px] px-6 lg:px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-white/60">Admin</div>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Clients</h1>
          <p className="mt-2 text-sm text-white/70">
            Base locale V1 (Prisma). Plus tard : sync GHL + templates.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            ← Admin
          </Link>
          <Link
            href="/admin/orgs/new"
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-red-400"
          >
            + Nouveau client
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-12 gap-0 border-b border-white/10 px-5 py-3 text-xs font-semibold text-white/60">
          <div className="col-span-4">Client</div>
          <div className="col-span-2">Slug</div>
          <div className="col-span-2">Email</div>
          <div className="col-span-2">SMS</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {orgs.length === 0 ? (
          <div className="px-5 py-10 text-sm text-white/70">
            Aucun client encore. Clique “Nouveau client”.
          </div>
        ) : (
          orgs.map((o) => (
            <div
              key={o.id}
              className="grid grid-cols-12 gap-0 px-5 py-4 border-b border-white/5"
            >
              <div className="col-span-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl border border-white/10 bg-slate-950/60"
                    style={{
                      boxShadow: o.brandPrimary
                        ? `0 0 0 1px ${o.brandPrimary}55`
                        : undefined,
                    }}
                  >
                    {/* logo optionnel */}
                    {o.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.logoUrl}
                        alt=""
                        className="h-9 w-9 rounded-xl object-cover"
                      />
                    ) : null}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {o.name}
                    </div>
                    <div className="text-xs text-white/55">
                      {o.timezone ?? "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-2 text-sm text-white/80">{o.slug}</div>
              <div className="col-span-2 text-sm text-white/80">
                {o.emailFrom ?? "—"}
              </div>
              <div className="col-span-2 text-sm text-white/80">
                {o.smsFrom ?? "—"}
              </div>

              <div className="col-span-2 flex justify-end">
                <Link
                  href={`/admin/orgs/${o.id}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Gérer →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
