// lib/autopilot/adapters.ts
import type { AutoPilotContext } from "./types";

/**
 * ADAPTER LAYER
 * Branche ici tes endpoints existants (ou server actions).
 * V1: ultra simple.
 */

export type AutoPilotAdapters = {
  markTreated: (ctx: AutoPilotContext) => Promise<void>;
  sendSms: (ctx: AutoPilotContext, message: string) => Promise<void>;
  sendEmail: (ctx: AutoPilotContext, subject: string, body: string) => Promise<void>;
  createTask: (ctx: AutoPilotContext, title: string, description: string) => Promise<void>;
};

async function postJson(url: string, payload: any) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
}

export const defaultAdapters: AutoPilotAdapters = {
  async markTreated(ctx) {
    // ✅ Ajuste l’URL/payload pour matcher ton backend existant
    await postJson("/api/recovery/mark-treated", {
      opportunityId: ctx.opportunityId,
      findingId: ctx.findingId,
    });
  },

  async sendSms(ctx, message) {
    await postJson("/api/recovery/send-sms", {
      opportunityId: ctx.opportunityId,
      to: ctx.contact.phone,
      message,
    });
  },

  async sendEmail(ctx, subject, body) {
    await postJson("/api/recovery/send-email", {
      opportunityId: ctx.opportunityId,
      to: ctx.contact.email,
      subject,
      body,
    });
  },

  async createTask(ctx, title, description) {
    await postJson("/api/recovery/create-task", {
      opportunityId: ctx.opportunityId,
      title,
      description,
    });
  },
};
