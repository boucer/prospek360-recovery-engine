// lib/autopilot/templates.ts
import type { AutoPilotContext } from "./types";

type RenderedMessage = { subject?: string; body: string };

function safeMoney(n?: number | null) {
  if (!n || Number.isNaN(n)) return "";
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
}

export function renderTemplate(key: string, ctx: AutoPilotContext): RenderedMessage | null {
  switch (key) {
    case "PAYMENT_REMINDER": {
      if (!ctx.paymentLink || !ctx.invoiceAmount) return null;
      const amount = safeMoney(ctx.invoiceAmount);
      return {
        subject: "Rappel de paiement",
        body:
          `Petit rappel 🙂 Il reste un paiement de ${amount} à compléter.\n` +
          `Lien sécurisé : ${ctx.paymentLink}\n\n` +
          `Si tu as déjà payé, ignore ce message. Merci!`,
      };
    }

    case "PAYMENT_FAILED": {
      if (!ctx.paymentLink) return null;
      return {
        subject: "Paiement à compléter",
        body:
          `On dirait que le paiement n’a pas passé.\n` +
          `Tu peux réessayer ici : ${ctx.paymentLink}\n\n` +
          `Besoin d’aide? Réponds à ce message.`,
      };
    }

    case "ACTIVATION_NUDGE": {
      return {
        subject: "Activation requise",
        body:
          `Dernière étape : il manque l’activation pour que tout fonctionne.\n` +
          `Réponds à ce message et je te guide en 2 minutes.`,
      };
    }

    case "COLD_LEAD_NUDGE": {
      return {
        subject: "On avance?",
        body:
          `Salut! Veux-tu que je te propose une option simple pour avancer cette semaine?\n` +
          `Réponds “oui” et je t’envoie ça.`,
      };
    }

    case "INACTIVE_CLIENT_NUDGE": {
      return {
        subject: "Petit check-in",
        body:
          `Petit message rapide 🙂 On fait un check-in pour voir si tu veux qu’on relance l’élan.\n` +
          `Je peux te proposer 2 options faciles.`,
      };
    }

    default:
      return null;
  }
}
