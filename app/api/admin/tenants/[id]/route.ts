import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  return NextResponse.json({ tenant });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();

  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      name: body?.name !== undefined ? String(body.name) : undefined,
      slug: body?.slug !== undefined ? String(body.slug) : undefined,
      logoUrl: body?.logoUrl !== undefined ? (body.logoUrl ? String(body.logoUrl) : null) : undefined,
      primaryColor: body?.primaryColor !== undefined ? (body.primaryColor ? String(body.primaryColor) : null) : undefined,
      emailFrom: body?.emailFrom !== undefined ? (body.emailFrom ? String(body.emailFrom) : null) : undefined,
      smsFrom: body?.smsFrom !== undefined ? (body.smsFrom ? String(body.smsFrom) : null) : undefined,
      isActive: body?.isActive !== undefined ? Boolean(body.isActive) : undefined,
    },
  });

  return NextResponse.json({ tenant: updated });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await prisma.tenant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
