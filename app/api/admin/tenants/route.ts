import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenants = await prisma.tenant.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tenants });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const name = String(body?.name ?? "").trim();
  const slug = String(body?.slug ?? "").trim();

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug required" }, { status: 400 });
  }

  const created = await prisma.tenant.create({
    data: {
      name,
      slug,
      logoUrl: body?.logoUrl ? String(body.logoUrl) : null,
      primaryColor: body?.primaryColor ? String(body.primaryColor) : null,
      emailFrom: body?.emailFrom ? String(body.emailFrom) : null,
      smsFrom: body?.smsFrom ? String(body.smsFrom) : null,
      isActive: Boolean(body?.isActive ?? true),
    },
  });

  return NextResponse.json({ tenant: created });
}
