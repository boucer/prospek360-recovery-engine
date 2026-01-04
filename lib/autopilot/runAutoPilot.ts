// lib/autopilot/runAutoPilot.ts
import type { AutoPilotAdapters } from "./adapters";
import { defaultAdapters } from "./adapters";
import { decideAutoPilotV1 } from "./decision";
import { renderTemplate } from "./templates";
import type { AutoPilotContext, AutoPilotLogEntry, AutoPilotRunResult } from "./types";
import { acquireLock, releaseLock, appendLog, lastLogMatching } from "./storage";

function isoNow() {
  return new Date().toISOString();
}

function hoursBetween(aIso: string, bIso: string) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.abs(b - a) / (1000 * 60 * 60);
}

function baseEntry(ctx: AutoPilotContext): Omit<AutoPilotLogEntry, "action" | "channel" | "status"> {
  return {
    ts: isoNow(),
    source: "AUTO_PILOT",
    opportunityId: ctx.opportunityId,
    findingId: ctx.findingId,
    findingType: ctx.findingType,
  };
}

function getCtxLabel(ctx: AutoPilotContext) {
  return (ctx.title && String(ctx.title).trim())
    ? String(ctx.title).trim()
    : String(ctx.findingType || "Opportunité");
}

function summaryBlocked(ctx: AutoPilotContext, reasonTitle: string, lines: string[]): AutoPilotRunResult["userSummary"] {
  const label = getCtxLabel(ctx);
  return {
    title: "⚠️ Auto-Pilot bloqué",
    lines: [`• ${label}`, `• ${reasonTitle}`, ...lines],
  };
}

function summaryInfo(ctx: AutoPilotContext, title: string, lines: string[]): AutoPilotRunResult["userSummary"] {
  const label = getCtxLabel(ctx);
  return {
    title,
    lines: [`• ${label}`, ...lines],
  };
}

export async function runAutoPilotV1(
  ctx: AutoPilotContext,
  adapters: AutoPilotAdapters = defaultAdapters
): Promise<AutoPilotRunResult> {
  const steps: AutoPilotLogEntry[] = [];
  const lockKey = ctx.findingId || ctx.opportunityId;

  // 1) lock anti double-run (60s)
  if (!acquireLock(lockKey, 60_000)) {
    return {
      ok: false,
      blocked: true,
      blockReason: "ALREADY_RUNNING",
      steps,
      userSummary: summaryBlocked(ctx, "Déjà en cours d’exécution.", ["→ Réessaie dans quelques secondes."]),
    };
  }

  try {
    // 2) hard stops
    if (ctx.treated) {
      return {
        ok: false,
        blocked: true,
        blockReason: "ALREADY_TREATED",
        steps,
        userSummary: summaryBlocked(ctx, "Déjà marqué comme traité.", ["→ Va dans l’historique si tu veux annuler (Undo)."]),
      };
    }

    if (ctx.contact.optOut) {
      return {
        ok: false,
        blocked: true,
        blockReason: "OPTOUT",
        steps,
        userSummary: summaryBlocked(ctx, "Contact non joignable (opt-out / DNC).", [
          "→ Auto-Pilot n’enverra rien automatiquement.",
          "→ Crée plutôt une tâche manuelle si nécessaire.",
        ]),
      };
    }

    const hasContact = !!ctx.contact.phone || !!ctx.contact.email;
    if (!hasContact) {
      return {
        ok: false,
        blocked: true,
        blockReason: "MISSING_CONTACT",
        steps,
        userSummary: summaryBlocked(ctx, "Aucune info de contact (email / téléphone).", [
          "→ Ajoute un email ou un numéro pour activer l’envoi automatique.",
          "→ Sinon, utilise “Copier le message” et fais l’action manuellement.",
        ]),
      };
    }

    // 3) decide next action FIRST (ne pas dépendre de markTreated)
    const decision = decideAutoPilotV1(ctx);

    if (decision.kind === "STOP") {
      const entry: AutoPilotLogEntry = {
        ...baseEntry(ctx),
        action: "STOP",
        channel: "NONE",
        status: "BLOCKED",
        reason: "LOW_CONFIDENCE",
      };
      steps.push(entry);
      appendLog(lockKey, entry);

      return {
        ok: true,
        steps,
        userSummary: summaryInfo(ctx, "✅ Auto-Pilot (aucune action auto)", [
          "• Confiance insuffisante pour envoyer automatiquement.",
          "→ Utilise “Copier le message” ou crée une tâche manuelle.",
        ]),
      };
    }

    // 4) cooldown check (localStorage V1)
    if (decision.cooldownHours) {
      const last = lastLogMatching(lockKey, (e) => {
        const isSend = e.action === "SEND_SMS" || e.action === "SEND_EMAIL";
        return isSend && e.status === "SUCCESS" && e.findingType === ctx.findingType;
      });

      if (last && hoursBetween(last.ts, isoNow()) < decision.cooldownHours) {
        // fallback task
        try {
          await adapters.createTask(
            ctx,
            "Action requise – Auto-Pilot bloqué",
            `Raison: cooldown actif (${decision.cooldownHours}h)\nSuggestion: ${decision.summaryLabel}`
          );
        } catch {}

        const entry: AutoPilotLogEntry = {
          ...baseEntry(ctx),
          action: "CREATE_TASK",
          channel: "TASK",
          status: "SUCCESS",
          reason: "COOLDOWN_ACTIVE",
        };
        steps.push(entry);
        appendLog(lockKey, entry);

        // essayer de marquer traité quand même (non bloquant)
        let treatedOk = false;
        try {
          await adapters.markTreated(ctx);
          treatedOk = true;
          const te: AutoPilotLogEntry = {
            ...baseEntry(ctx),
            action: "MARK_TREATED",
            channel: "NONE",
            status: "SUCCESS",
          };
          steps.push(te);
          appendLog(lockKey, te);
        } catch (e: any) {
          const te: AutoPilotLogEntry = {
            ...baseEntry(ctx),
            action: "MARK_TREATED",
            channel: "NONE",
            status: "FAILED",
            reason: e?.message || "UNKNOWN",
          };
          steps.push(te);
          appendLog(lockKey, te);
        }

        return {
          ok: true,
          steps,
          userSummary: summaryInfo(ctx, "✅ Auto-Pilot terminé (fallback)", [
            `• Envoi bloqué (cooldown ${decision.cooldownHours}h).`,
            "• Tâche créée automatiquement.",
            treatedOk ? "• Marqué comme traité." : "• ⚠️ Traité non confirmé (backend).",
          ]),
        };
      }
    }

    // 5) template render
    let subject = "";
    let body = "";

    if (decision.templateKey) {
      const rendered = renderTemplate(decision.templateKey, ctx);
      if (!rendered) {
        // fallback task
        try {
          await adapters.createTask(
            ctx,
            "Action requise – Template manquant",
            `Raison: template/vars manquants\nSuggestion: ${decision.summaryLabel}\nTemplate: ${decision.templateKey}`
          );
        } catch {}

        const entry: AutoPilotLogEntry = {
          ...baseEntry(ctx),
          action: "CREATE_TASK",
          channel: "TASK",
          status: "SUCCESS",
          reason: "MISSING_TEMPLATE",
        };
        steps.push(entry);
        appendLog(lockKey, entry);

        // marquer traité non bloquant
        let treatedOk = false;
        try {
          await adapters.markTreated(ctx);
          treatedOk = true;
          const te: AutoPilotLogEntry = {
            ...baseEntry(ctx),
            action: "MARK_TREATED",
            channel: "NONE",
            status: "SUCCESS",
          };
          steps.push(te);
          appendLog(lockKey, te);
        } catch (e: any) {
          const te: AutoPilotLogEntry = {
            ...baseEntry(ctx),
            action: "MARK_TREATED",
            channel: "NONE",
            status: "FAILED",
            reason: e?.message || "UNKNOWN",
          };
          steps.push(te);
          appendLog(lockKey, te);
        }

        return {
          ok: true,
          steps,
          userSummary: summaryInfo(ctx, "✅ Auto-Pilot terminé (fallback)", [
            "• Message automatique indisponible (template/variables manquantes).",
            "• Tâche créée automatiquement.",
            treatedOk ? "• Marqué comme traité." : "• ⚠️ Traité non confirmé (backend).",
          ]),
        };
      }

      subject = rendered.subject || "";
      body = rendered.body;
    }

    // 6) execute decision FIRST
    let actionOk = false;
    try {
      if (decision.kind === "SEND_SMS") {
        if (!ctx.contact.phone) throw new Error("MISSING_CONTACT");
        await adapters.sendSms(ctx, body);

        const entry: AutoPilotLogEntry = {
          ...baseEntry(ctx),
          action: "SEND_SMS",
          channel: "SMS",
          status: "SUCCESS",
          details: { label: decision.summaryLabel },
        };
        steps.push(entry);
        appendLog(lockKey, entry);

        actionOk = true;
      } else if (decision.kind === "SEND_EMAIL") {
        if (!ctx.contact.email) throw new Error("MISSING_CONTACT");
        await adapters.sendEmail(ctx, subject || "Message", body);

        const entry: AutoPilotLogEntry = {
          ...baseEntry(ctx),
          action: "SEND_EMAIL",
          channel: "EMAIL",
          status: "SUCCESS",
          details: { label: decision.summaryLabel },
        };
        steps.push(entry);
        appendLog(lockKey, entry);

        actionOk = true;
      } else if (decision.kind === "CREATE_TASK") {
        const title = `Suivi requis — ${decision.summaryLabel}`;
        const desc = `Auto-Pilot a choisi une tâche.\nFinding: ${ctx.findingType}\nSévérité: ${ctx.severity}`;
        await adapters.createTask(ctx, title, desc);

        const entry: AutoPilotLogEntry = {
          ...baseEntry(ctx),
          action: "CREATE_TASK",
          channel: "TASK",
          status: "SUCCESS",
        };
        steps.push(entry);
        appendLog(lockKey, entry);

        actionOk = true;
      }
    } catch (e: any) {
      const entry: AutoPilotLogEntry = {
        ...baseEntry(ctx),
        action: decision.kind,
        channel: decision.channel,
        status: "FAILED",
        reason: e?.message || "UNKNOWN",
      };
      steps.push(entry);
      appendLog(lockKey, entry);

      // fallback task (best effort)
      try {
        await adapters.createTask(
          ctx,
          "Action requise – Auto-Pilot a échoué",
          `Raison: ${e?.message || "UNKNOWN"}\nSuggestion: ${decision.summaryLabel}`
        );
      } catch {}

      return {
        ok: false,
        steps,
        userSummary: summaryBlocked(ctx, "Action automatique a échoué.", [
          `→ Suggestion: ${decision.summaryLabel}`,
          "→ Une tâche a été créée (si disponible).",
        ]),
      };
    }

    // 7) mark treated LAST (non bloquant)
    let treatedOk = false;
    try {
      await adapters.markTreated(ctx);
      treatedOk = true;

      const te: AutoPilotLogEntry = {
        ...baseEntry(ctx),
        action: "MARK_TREATED",
        channel: "NONE",
        status: "SUCCESS",
      };
      steps.push(te);
      appendLog(lockKey, te);
    } catch (e: any) {
      const te: AutoPilotLogEntry = {
        ...baseEntry(ctx),
        action: "MARK_TREATED",
        channel: "NONE",
        status: "FAILED",
        reason: e?.message || "UNKNOWN",
      };
      steps.push(te);
      appendLog(lockKey, te);
    }

    // 8) final summary
    return {
      ok: true,
      steps,
      userSummary: summaryInfo(ctx, "✅ Auto-Pilot terminé", [
        actionOk ? `• Action: ${decision.summaryLabel}` : "• Action exécutée.",
        treatedOk ? "• Marqué comme traité." : "• ⚠️ Traité non confirmé (backend).",
      ]),
    };
  } finally {
    releaseLock(lockKey);
  }
}
