// lib/tenant.ts
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const TENANT_COOKIE = "tenant_slug";

/**
 * Retourne le tenant "courant" selon cookie tenant_slug.
 * Fallback V1:
 * 1) cookie -> tenant actif correspondant
 * 2) premier tenant actif (createdAt ASC)
 * 3) null si aucun tenant
 */
export async function getCurrentTenant() {
  const jar = await cookies();
  const slug = jar.get(TENANT_COOKIE)?.value?.trim();

  if (slug) {
    const t = await prisma.tenant.findFirst({
      where: { slug, isActive: true },
    });
    if (t) return t;
  }

  const fallback = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return fallback;
}

/**
 * Même chose, mais throw si aucun tenant actif n'existe.
 */
export async function requireTenant() {
  const t = await getCurrentTenant();
  if (!t) throw new Error("Aucun tenant actif. Crée un tenant dans /admin/tenants.");
  return t;
}
