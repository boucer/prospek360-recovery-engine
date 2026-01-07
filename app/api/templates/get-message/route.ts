// app/api/templates/get-message/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { organizationId, key, channel } = await req.json();

  if (!organizationId || !key) {
    return NextResponse.json(
      { error: "organizationId et key requis" },
      { status: 400 }
    );
  }

  const template = await prisma.messageTemplate.findFirst({
    where: {
      organizationId,
      key,
      channel: channel ?? "SMS",
      isActive: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!template) {
    return NextResponse.json({ body: null });
  }

  return NextResponse.json({
    body: template.body,
    subject: template.subject ?? null,
  });
}
