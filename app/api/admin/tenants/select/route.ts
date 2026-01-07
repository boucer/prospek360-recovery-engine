// app/api/admin/tenants/select/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { TENANT_COOKIE } from "@/lib/tenant";

export async function POST(req: Request) {
  await requireAdmin();

  const contentType = req.headers.get("content-type") || "";
  let slug: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    slug = typeof body?.slug === "string" ? body.slug : null;
  } else {
    const form = await req.formData().catch(() => null);
    const v = form?.get("slug");
    slug = typeof v === "string" ? v : null;
  }

  slug = (slug || "").trim();
  if (!slug) {
    return NextResponse.redirect(new URL("/admin/tenants?err=missing-slug", req.url));
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug, isActive: true },
    select: { slug: true },
  });

  if (!tenant) {
    return NextResponse.redirect(new URL("/admin/tenants?err=not-found", req.url));
  }

  const jar = await cookies();
  jar.set(TENANT_COOKIE, tenant.slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // ✅ REDIRECT (le meilleur UX V1)
  return NextResponse.redirect(new URL("/audit", req.url));
}
