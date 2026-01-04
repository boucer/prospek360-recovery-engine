import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  // org unique V1
  const organization = await prisma.organization.findFirst();
  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: {
      organizationId: organization.id,
      firstName: "Jean",
      lastName: "Test",
      phone: "+15145550000",
      status: "NEW",
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      organizationId: organization.id,
      contactId: contact.id,
      channel: "SMS",
      lastMessageAt: new Date(),
    },
  });

  const message = await prisma.message.create({
    data: {
      organizationId: organization.id,
      contactId: contact.id,
      conversationId: conversation.id,
      direction: "IN",
      channel: "SMS",
      body: "Bonjour, je voulais des infos.",
    },
  });

  return NextResponse.json({
    ok: true,
    contact,
    conversation,
    message,
  });
}
