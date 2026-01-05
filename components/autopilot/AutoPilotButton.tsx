"use client";

import * as React from "react";
import type { AutoPilotContext } from "@/lib/autopilot/types";
import { runAutoPilotV1 } from "@/lib/autopilot/runAutoPilot";

export type AutoPilotResult = {
  title: string;
  lines: string[];
  blockReason?: string;

  // Valeur V1.1 (estimations simples — on raffinera quand les actions seront réellement branchées)
  executedSteps: number;
  timeSavedMin: number;
  recoveredOpportunities: number;

  // Journal lisible (basé sur lines)
  logs: string[];
};

type Props = {
  ctx: AutoPilotContext;
  onDone?: (result: AutoPilotResult) => void;
  className?: string;
};

type StoredContact = { email?: string; phone?: string };

function contactKey(ctx: AutoPilotContext) {
  const id = ctx.findingId || ctx.opportunityId;
  return `autopilot:contact:${id}`;
}

function normalizeEmail(v: string) {
  return v.trim();
}

function normalizePhone(v: string) {
  // V1: simple (pas de lib). On enlève espaces/tirets/parenthèses.
  return v.replace(/[^\d+]/g, "").trim();
}

function loadStoredContact(ctx: AutoPilotContext): StoredContact | null {
  try {
    const raw = localStorage.getItem(contactKey(ctx));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredContact;
    return parsed && (parsed.email || parsed.phone) ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredContact(ctx: AutoPilotContext, contact: StoredContact) {
  try {
    localStorage.setItem(contactKey(ctx), JSON.stringify(contact));
  } catch {}
}

function mergeCtxWithStored(ctx: AutoPilotContext): AutoPilotContext {
  const stored = typeof window !== "undefined" ? loadStoredContact(ctx) : null;
  if (!stored) return ctx;

  return {
    ...ctx,
    contact: {
      ...ctx.contact,
      email: ctx.contact.email || stored.email || undefined,
      phone: ctx.contact.phone || stored.phone || undefined,
    },
  };
}

function cleanBullet(line: string) {
  return line.replace(/^•\s?/, "").trim();
}

export default function AutoPilotButton({ ctx, onDone, className }: Props) {
  const [isRunning, setIsRunning] = React.useState(false);
  const [title, setTitle] = React.useState<string | null>(null);
  const [lines, setLines] = React.useState<string[]>([]);
  const [blockReason, setBlockReason] = React.useState<string | undefined>(undefined);

  // Modal “Ajouter contact”
  const [showModal, setShowModal] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  // On pré-remplit le modal avec ce qu'on a (ctx) + ce qu'on a déjà en localStorage
  React.useEffect(() => {
    const merged = mergeCtxWithStored(ctx);
    setEmail(merged.contact.email || "");
    setPhone(merged.contact.phone || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.opportunityId, ctx.findingId]);

  async function run(override?: Partial<AutoPilotContext>) {
    if (isRunning) return;

    setIsRunning(true);
    setTitle(null);
    setLines([]);
    setBlockReason(undefined);

    try {
      const merged = mergeCtxWithStored(ctx);
      const finalCtx: AutoPilotContext = { ...merged, ...(override || {}) };

      const res = await runAutoPilotV1(finalCtx);

      const t = res.userSummary.title || "✅ Auto-Pilot terminé";
      const ls = res.userSummary.lines || [];
      const br = (res as any).blockReason as string | undefined;

      setTitle(t);
      setLines(ls);
      setBlockReason(br);

      // ====== V1.1: Résultat structuré pour AutopilotClient ======
      const cleanedLogs = ls.map((l) => `✓ ${cleanBullet(l)}`);

      // Estimation simple:
      // - si bloqué => 0
      // - sinon => on prend jusqu’à 3 “étapes” visibles
      const executedSteps = br ? 0 : Math.min(3, Math.max(1, ls.length));
      const timeSavedMin = br ? 0 : executedSteps * 5;
      const recoveredOpportunities = br ? 0 : executedSteps > 0 ? 1 : 0;

      onDone?.({
        title: t,
        lines: ls,
        blockReason: br,
        executedSteps,
        timeSavedMin,
        recoveredOpportunities,
        logs: cleanedLogs.length ? cleanedLogs : br ? ["! Action requise avant exécution automatique."] : ["✓ Auto-Pilot terminé"],
      });
    } catch {
      const t = "❌ Auto-Pilot a échoué";
      const ls = ["• Réessaie dans quelques secondes."];

      setTitle(t);
      setLines(ls);
      setBlockReason(undefined);

      onDone?.({
        title: t,
        lines: ls,
        blockReason: undefined,
        executedSteps: 0,
        timeSavedMin: 0,
        recoveredOpportunities: 0,
        logs: ["! Erreur d’exécution. Réessaie."],
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleClick() {
    await run();
  }

  function openAddContact() {
    setFormError(null);

    // On recharge ce qui existe déjà
    const merged = mergeCtxWithStored(ctx);
    setEmail(merged.contact.email || "");
    setPhone(merged.contact.phone || "");

    setShowModal(true);
  }

  async function handleSaveContact() {
    setFormError(null);

    const cleanEmail = email ? normalizeEmail(email) : "";
    const cleanPhone = phone ? normalizePhone(phone) : "";

    // Validation minimale V1
    const hasEmail = !!cleanEmail;
    const hasPhone = !!cleanPhone;

    if (!hasEmail && !hasPhone) {
      setFormError("Ajoute au moins un email ou un téléphone.");
      return;
    }

    if (hasEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setFormError("Email invalide.");
      return;
    }

    // Sauvegarde locale
    saveStoredContact(ctx, { email: cleanEmail || undefined, phone: cleanPhone || undefined });

    setShowModal(false);

    // Relance Auto-Pilot immédiatement avec le contact
    await run({
      contact: {
        ...ctx.contact,
        email: cleanEmail || undefined,
        phone: cleanPhone || undefined,
      },
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isRunning}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
          "bg-white/10 hover:bg-white/15 border border-white/15",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        <span>⚡</span>
        <span>{isRunning ? "Auto-Pilot…" : "Auto-Pilot Recovery"}</span>
      </button>

      {title ? (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-semibold">{title}</div>

          {lines?.length ? (
            <div className="mt-2 space-y-1 text-xs opacity-80">
              {lines.slice(0, 5).map((l, idx) => (
                <div key={idx}>{l}</div>
              ))}
            </div>
          ) : null}

          {/* CTA contextuel */}
          {blockReason === "MISSING_CONTACT" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openAddContact}
                className="rounded-lg bg-[#c33541] px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
              >
                ➕ Ajouter contact
              </button>
              <div className="text-[11px] opacity-60 self-center">
                (Sauvegardé localement pour l’instant — sera relié à GHL plus tard)
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Modal Ajouter contact */}
      {showModal ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Ajouter un contact</div>
                <div className="mt-1 text-xs opacity-70">
                  V1: on sauve localement. Quand GHL/Leads sera branché, ce sera automatiquement sync.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold opacity-80">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: client@entreprise.com"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold opacity-80">Téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: 514-555-1234"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
                />
                <div className="mt-1 text-[11px] opacity-60">
                  Astuce: tu peux entrer n’importe quel format, on le normalise automatiquement.
                </div>
              </div>

              {formError ? (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                  {formError}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                className="rounded-xl bg-[#c33541] px-4 py-2 text-sm font-semibold hover:opacity-95"
              >
                Sauvegarder & relancer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
