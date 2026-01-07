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

  const tpl = await prisma.messageTemplate.findFirst({
  where: {
    organizationId,
    channel: channel ?? "SMS",
    isActive: true,
  },
  orderBy: { updatedAt: "desc" },
});

return NextResponse.json({
  ok: true,
  template: tpl?.body ?? "Message par défaut (V1).",
  subject: tpl?.subject ?? null,
});

}
