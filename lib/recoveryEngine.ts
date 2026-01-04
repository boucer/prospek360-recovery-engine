export type RecoveryFindingInput = {
  type: string;
  title: string;
  description: string;
  action: string;
  severity: number; // 1-5
  valueCents: number; // ✅ nouveau
};

const TYPE_VALUE_CENTS: Record<string, number> = {
  HIGH_INTENT_NO_FOLLOWUP: 25000, // 250$
  NO_REPLY_7D: 12000,            // 120$
  OPEN_NO_ACTION: 9000,          // 90$
  ABANDONED_LEAD: 15000,         // 150$
  CLOSED_LOST_RECOVERY: 20000,   // 200$
};

export function runRecoveryEngine(): RecoveryFindingInput[] {
  const base = [
    {
      type: "NO_REPLY_7D",
      title: "Contact sans réponse depuis 7 jours",
      description: "Le prospect n’a pas répondu depuis plus de 7 jours.",
      action: "Relance courte + question fermée (Oui/Non).",
      severity: 3,
    },
    {
      type: "HIGH_INTENT_NO_FOLLOWUP",
      title: "Intérêt élevé sans suivi",
      description: "Le prospect a montré un intérêt fort, mais aucun suivi n’a été fait.",
      action: "Message prioritaire + proposition de créneau (2 choix).",
      severity: 5,
    },
  ];

  return base.map((f) => ({
    ...f,
    valueCents: TYPE_VALUE_CENTS[f.type] ?? f.severity * 5000, // fallback: 50$ * severity
  }));
}
