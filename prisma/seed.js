// prisma/seed.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  const tenantSlug = "demo";
  const orgName = "Prospek 360 — Demo";

  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });

  const existingOrg = await prisma.organization.findFirst({
    where: { name: orgName },
    select: { id: true },
  });

  if (existingOrg) {
    await prisma.messageTemplate.deleteMany({ where: { organizationId: existingOrg.id } });

    const runs = await prisma.recoveryRun.findMany({
      where: { organizationId: existingOrg.id },
      select: { id: true },
    });
    const runIds = runs.map((r) => r.id);

    if (runIds.length) {
      await prisma.recoveryFinding.updateMany({
        where: { recoveryRunId: { in: runIds } },
        data: { recoveryRunId: null },
      });

      await prisma.recoveryRun.deleteMany({ where: { id: { in: runIds } } });
    }

    const auditRuns = await prisma.auditRun.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true },
    });

    if (auditRuns.length) {
      await prisma.recoveryFinding.deleteMany({
        where: { auditRunId: { in: auditRuns.map((a) => a.id) } },
      });
      await prisma.auditRun.deleteMany({ where: { id: { in: auditRuns.map((a) => a.id) } } });
    }

    await prisma.organization.delete({ where: { id: existingOrg.id } });
  }

  if (existingTenant) {
    await prisma.template.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.tenant.delete({ where: { id: existingTenant.id } });
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: "Tenant Demo",
      slug: tenantSlug,
      primaryColor: "#c33541",
      emailFrom: "leads@demo.prospek360.com",
      smsFrom: "+15140000000",
      logoUrl: null,
    },
    select: { id: true, slug: true },
  });

  await prisma.template.createMany({
    data: [
      {
        tenantId: tenant.id,
        key: "NO_REPLY_7D",
        channel: "SMS",
        title: "Relance douce — 7 jours",
        content:
          "Salut {name} 👋 Juste un petit suivi : est-ce que tu veux qu’on avance sur {service} ? Je peux te proposer 2 créneaux aujourd’hui.",
      },
      {
        tenantId: tenant.id,
        key: "MISSED_CALL",
        channel: "SMS",
        title: "Appel manqué — rappel rapide",
        content:
          "Salut {name} 👋 Désolé, j’ai manqué ton appel. Tu préfères que je te rappelle maintenant ou tu veux me dire ici ce dont tu as besoin ?",
      },
      {
        tenantId: tenant.id,
        key: "QUOTE_FOLLOWUP",
        channel: "EMAIL",
        title: "Suivi de soumission",
        content:
          "Bonjour {name},\n\nPetit suivi concernant la soumission pour {service}. Est-ce que tu as des questions avant qu’on réserve la date ?\n\n— {company}",
      },
      {
        tenantId: tenant.id,
        key: "AUTOPILOT_NEXT",
        channel: "AUTOPILOT",
        title: "Auto-Pilot — next best action",
        content:
          "1) Copier message\n2) Envoyer\n3) Marquer traité\n4) Passer au prochain",
      },
    ],
  });

  const org = await prisma.organization.create({
    data: {
      name: orgName,
      brandColor: "#c33541",
      replyToEmail: "support@demo.prospek360.com",
      senderPhone: "+15140000000",
      timezone: "America/Toronto",
      locale: "fr-CA",
    },
    select: { id: true },
  });

  await prisma.messageTemplate.createMany({
    data: [
      {
        organizationId: org.id,
        name: "Relance rapide (SMS)",
        channel: "SMS",
        subject: null,
        body:
          "Salut {name} 👋 Juste un suivi rapide. Est-ce que tu veux qu’on avance aujourd’hui ?",
      },
      {
        organizationId: org.id,
        name: "Soumission (EMAIL)",
        channel: "EMAIL",
        subject: "Suivi — soumission {service}",
        body:
          "Bonjour {name},\n\nJe voulais m’assurer que tu as bien reçu la soumission pour {service}. On peut confirmer la date dès que tu es prêt.\n\n— {company}",
      },
    ],
  });

  const recoveryRun = await prisma.recoveryRun.create({
    data: {
      organizationId: org.id,
      status: "COMPLETED",
      createdAt: daysAgo(1),
    },
    select: { id: true },
  });

  const auditRun = await prisma.auditRun.create({
    data: {
      status: "COMPLETED",
      message: "Seed demo — audit généré pour test V1",
      createdAt: daysAgo(1),
    },
    select: { id: true },
  });

  const findings = [
    {
      type: "MISSED_CALL",
      title: "Appel manqué — client chaud",
      description: "Un appel manqué sur une fenêtre business hours. Risque élevé de perte.",
      action: "Envoyer SMS de rappel + proposer 2 créneaux",
      severity: 5,
      valueCents: 45000,
      createdAt: daysAgo(5),
      handled: false,
    },
    {
      type: "NO_REPLY_7D",
      title: "Aucun retour depuis 7 jours",
      description: "Lead qualifié, aucune réponse. Une relance courte peut récupérer la vente.",
      action: "Relance SMS courte + question fermée",
      severity: 4,
      valueCents: 30000,
      createdAt: daysAgo(7),
      handled: false,
    },
    {
      type: "QUOTE_FOLLOWUP",
      title: "Soumission envoyée — pas de confirmation",
      description: "Soumission envoyée, pas de retour. Très bon candidat pour follow-up.",
      action: "Email de suivi + proposition de date",
      severity: 5,
      valueCents: 120000,
      createdAt: daysAgo(10),
      handled: false,
    },
    {
      type: "DORMANT_LEAD",
      title: "Lead dormant 14 jours",
      description: "Lead froid mais récupérable si on propose une option simple.",
      action: "Relance SMS : ‘On avance ou je ferme le dossier ?’",
      severity: 3,
      valueCents: 20000,
      createdAt: daysAgo(14),
      handled: false,
    },
    {
      type: "PAYMENT_ABANDON",
      title: "Paiement abandonné",
      description: "Le client a presque payé. Probable friction (question / timing).",
      action: "SMS : ‘Je peux t’aider à compléter le paiement ?’",
      severity: 4,
      valueCents: 60000,
      createdAt: daysAgo(3),
      handled: true,
      handledAt: daysAgo(1),
    },
    {
      type: "NO_SHOW",
      title: "Rendez-vous manqué / no-show",
      description: "Risque de perdre la confiance. Relance empathique recommandée.",
      action: "SMS empathique + replanifier",
      severity: 3,
      valueCents: 25000,
      createdAt: daysAgo(6),
      handled: true,
      handledAt: daysAgo(2),
    },
    {
      type: "INBOUND_FORM",
      title: "Formulaire inbound — pas répondu",
      description: "Demande inbound reçue. Réponse rapide augmente conversion.",
      action: "SMS + email de prise en charge",
      severity: 4,
      valueCents: 35000,
      createdAt: daysAgo(2),
      handled: false,
    },
    {
      type: "HOT_INTENT",
      title: "Signal d’intention élevé",
      description: "Lead a consulté plusieurs fois l’offre / page service.",
      action: "Relance personnalisée + CTA simple",
      severity: 5,
      valueCents: 80000,
      createdAt: daysAgo(1),
      handled: false,
    },
    {
      type: "LOW_VALUE_CLEANUP",
      title: "Nettoyage — lead faible valeur",
      description: "Pas prioritaire, mais utile pour garder l’inbox propre.",
      action: "Message de clôture ‘On ferme le dossier ?’",
      severity: 2,
      valueCents: 15000,
      createdAt: daysAgo(20),
      handled: false,
    },
    {
      type: "FOLLOWUP_AFTER_CALL",
      title: "Suivi après appel — action promise",
      description: "Après appel, une action promise n’a pas été envoyée.",
      action: "Envoyer résumé + next step + date",
      severity: 4,
      valueCents: 50000,
      createdAt: daysAgo(4),
      handled: false,
    },
  ];

  for (const f of findings) {
    await prisma.recoveryFinding.create({
      data: {
        auditRunId: auditRun.id,
        type: f.type,
        title: f.title,
        description: f.description,
        action: f.action,
        severity: f.severity,
        valueCents: f.valueCents,
        createdAt: f.createdAt,
        handled: f.handled || false,
        handledAt: f.handledAt || null,
        recoveryRunId: recoveryRun.id,
      },
    });
  }

  console.log("✅ Seed completed");
  console.log("Tenant:", tenant.slug);
  console.log("Organization:", orgName);
  console.log("AuditRun:", auditRun.id);
  console.log("RecoveryRun:", recoveryRun.id);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
