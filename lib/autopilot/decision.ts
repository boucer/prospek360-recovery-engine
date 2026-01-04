// lib/autopilot/decision.ts
import type { AutoPilotContext, AutoPilotDecision } from "./types";

function hasAnyContact(ctx: AutoPilotContext) {
  return !!ctx.contact.phone || !!ctx.contact.email;
}

function preferredChannel(ctx: AutoPilotContext): "SMS" | "EMAIL" | "TASK" {
  if (ctx.contact.phone) return "SMS";
  if (ctx.contact.email) return "EMAIL";
  return "TASK";
}

export function decideAutoPilotV1(ctx: AutoPilotContext): AutoPilotDecision {
  if (!hasAnyContact(ctx)) {
    return { kind: "STOP", channel: "NONE", summaryLabel: "Contact manquant" };
  }

  // PRIORITY ORDER (first match wins)

  // 1) PAYMENT_PENDING
  if (ctx.findingType === "PAYMENT_PENDING" && ctx.severity >= 4) {
    const ch = preferredChannel(ctx);
    return {
      kind: ch === "SMS" ? "SEND_SMS" : ch === "EMAIL" ? "SEND_EMAIL" : "CREATE_TASK",
      channel: ch,
      cooldownHours: 48,
      summaryLabel: "Rappel paiement",
      templateKey: "PAYMENT_REMINDER",
      requiredVars: ["invoiceAmount", "paymentLink"],
    };
  }

  // 2) PAYMENT_FAILED
  if (ctx.findingType === "PAYMENT_FAILED" && ctx.severity >= 4) {
    const ch = preferredChannel(ctx);
    return {
      kind: ch === "SMS" ? "SEND_SMS" : ch === "EMAIL" ? "SEND_EMAIL" : "CREATE_TASK",
      channel: ch,
      cooldownHours: 72,
      summaryLabel: "Échec paiement — relance",
      templateKey: "PAYMENT_FAILED",
      requiredVars: ["paymentLink"],
    };
  }

  // 3) ACTIVATION_MISSING
  if (ctx.findingType === "ACTIVATION_MISSING" && ctx.severity >= 3) {
    const ch = ctx.contact.email ? "EMAIL" : ctx.contact.phone ? "SMS" : "TASK";
    return {
      kind: ch === "EMAIL" ? "SEND_EMAIL" : ch === "SMS" ? "SEND_SMS" : "CREATE_TASK",
      channel: ch,
      cooldownHours: 72,
      summaryLabel: "Activation manquante",
      templateKey: "ACTIVATION_NUDGE",
      requiredVars: ["neverActivated"],
    };
  }

  // 4) NO_REPLY
  if (ctx.findingType === "NO_REPLY" && ctx.severity >= 3) {
    const ch = preferredChannel(ctx);
    return {
      kind: ch === "SMS" ? "SEND_SMS" : ch === "EMAIL" ? "SEND_EMAIL" : "CREATE_TASK",
      channel: ch,
      cooldownHours: 24 * 5,
      summaryLabel: "Relance lead froid",
      templateKey: "COLD_LEAD_NUDGE",
    };
  }

  // 5) INACTIVE_CLIENT
  if (ctx.findingType === "INACTIVE_CLIENT" && ctx.severity >= 3) {
    const ch = ctx.contact.email ? "EMAIL" : ctx.contact.phone ? "SMS" : "TASK";
    return {
      kind: ch === "EMAIL" ? "SEND_EMAIL" : ch === "SMS" ? "SEND_SMS" : "CREATE_TASK",
      channel: ch,
      cooldownHours: 24 * 7,
      summaryLabel: "Relance client inactif",
      templateKey: "INACTIVE_CLIENT_NUDGE",
    };
  }

  // 6) FOLLOW_UP_REQUIRED
  if (ctx.findingType === "FOLLOW_UP_REQUIRED" && ctx.severity >= 2) {
    return { kind: "CREATE_TASK", channel: "TASK", summaryLabel: "Créer une tâche de suivi" };
  }

  // 7) LOW_CONFIDENCE / fallback
  return { kind: "STOP", channel: "NONE", summaryLabel: "Confiance insuffisante" };
}
