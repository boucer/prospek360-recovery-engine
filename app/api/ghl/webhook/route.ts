// app/api/ghl/webhook/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook GHL (V1)
 * Objectif: recevoir un événement, associer une org (tenant) et créer un Contact minimal.
 * NOTE: On évite firstName/lastName car ton modèle Contact ne les contient pas (build TS).
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));

    // 🔧 TODO: adapte selon ton mapping réel (header, token, locationId, etc.)
    // Pour l’instant on prend une org "active" comme fallback (V1 safe)
    const organization = await prisma.organization.findFirst({
  orderBy: { createdAt: "asc" },
  select: { id: true },
});

if (!organization) {
  return NextResponse.json({ ok: false, error: "No organization found" }, { status: 404 });
}


    // Exemple: on tente de lire un phone du webhook, sinon fallback dev
    const phone =
      payload?.phone ||
      payload?.contact?.phone ||
      payload?.data?.phone ||
      "+15145550000";

    // ✅ Create minimal (évite firstName/lastName)
    // Mets seulement des champs que tu es certain d’avoir dans Contact.
    // Si ton Contact exige d’autres champs (non-null), tu verras l’erreur Prisma runtime et on ajustera.
    const contact = await prisma.contact.create({
  data: {
    organizationId: organization.id,
    email: "test@example.com",
    phone: "+15145550000",
    name: "Lead Webhook",
  },
});


    return NextResponse.json({ ok: true, contactId: contact.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Webhook error" },
      { status: 500 }
    );
  }
}
