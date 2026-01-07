import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import TenantFormClient from "../_components/TenantFormClient";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireAdmin();
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      emailFrom: true,
      smsFrom: true,
      isActive: true,
    },
  });

  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="mx-auto w-full max-w-[900px] px-6 py-10 text-white">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-lg font-semibold">Tenant introuvable</div>
            <div className="mt-2 text-sm text-white/70">
              ID: <code className="rounded bg-white/10 px-2 py-1">{id}</code>
            </div>
            <a
              href="/admin/tenants"
              className="mt-4 inline-flex rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400"
            >
              Retour à la liste
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <TenantFormClient mode="edit" initial={tenant as any} />;
}
