// app/admin/tenants/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { TENANT_COOKIE } from "@/lib/tenant";

export default async function TenantsPage() {
  await requireAdmin("/admin/tenants");

  const jar = await cookies();
  const currentSlug = jar.get(TENANT_COOKIE)?.value?.trim() || "";

  const tenants = await prisma.tenant.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      logoUrl: true,
      primaryColor: true,
      emailFrom: true,
      smsFrom: true,
      createdAt: true,
    },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto text-white">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="mt-1 text-sm text-white/70">
            Choisis le tenant “courant” (cookie) pour que l’app utilise son branding + templates.
          </p>

          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            <span className="font-semibold text-white/80">Tenant courant :</span>
            {currentSlug ? (
              <span className="rounded-lg bg-slate-950/60 px-2 py-1 text-white/80">
                {currentSlug}
              </span>
            ) : (
              <span className="text-white/60">aucun (fallback sur 1er tenant actif)</span>
            )}
          </div>
        </div>

        <Link
          href="/admin/tenants/new"
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:brightness-110"
        >
          + Nouveau tenant
        </Link>
      </div>

      <div className="grid gap-4">
        {tenants.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Aucun tenant pour le moment. Clique “Nouveau tenant”.
          </div>
        ) : (
          tenants.map((t) => {
            const isCurrent = currentSlug && t.slug === currentSlug;

            return (
              <div
                key={t.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden"
                      style={{
                        boxShadow: t.primaryColor
                          ? `0 0 0 1px ${t.primaryColor}55`
                          : undefined,
                      }}
                    >
                      {t.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{t.name}</div>

                        {isCurrent ? (
                          <span className="text-[11px] rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-emerald-200">
                            Tenant courant
                          </span>
                        ) : null}

                        <span
                          className={
                            t.isActive
                              ? "text-[11px] rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-emerald-200"
                              : "text-[11px] rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-red-200"
                          }
                        >
                          {t.isActive ? "Actif" : "Inactif"}
                        </span>
                      </div>

                      <div className="text-xs text-white/60">{t.slug}</div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
                        {t.emailFrom ? (
                          <span className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1">
                            Email: {t.emailFrom}
                          </span>
                        ) : null}
                        {t.smsFrom ? (
                          <span className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1">
                            SMS: {t.smsFrom}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Modifier
                    </Link>

                    <form action="/api/admin/tenants/select" method="post">
                      <input type="hidden" name="slug" value={t.slug} />
                      <button
                        type="submit"
                        disabled={!t.isActive}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold text-white transition ${
                          t.isActive
                            ? "bg-red-600 hover:bg-red-500"
                            : "bg-white/10 text-white/40 cursor-not-allowed"
                        }`}
                        title={
                          t.isActive
                            ? "Définir ce tenant comme tenant courant (cookie)"
                            : "Tenant inactif — impossible de le sélectionner"
                        }
                      >
                        Utiliser
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-white/70">
        <div className="font-semibold text-white/80">Note V1</div>
        <div className="mt-1">
          Le cookie <span className="text-white/90 font-semibold">tenant_slug</span> sert à sélectionner
          le branding + templates. Plus tard, on pourra basculer automatiquement via domaine/sous-domaine.
        </div>
      </div>
    </div>
  );
}
