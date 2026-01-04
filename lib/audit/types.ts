// lib/audit/types.ts

export type OpportunityPriority = "Très élevée" | "Élevée" | "Moyenne" | "Faible";

export type Opportunity = {
  id: string;

  // ✅ lien vers RecoveryFinding.id (quand applicable)
  findingId?: string;

  priorityLabel: OpportunityPriority;
  typeLabel: string;
  typeCode: string;
  detail: string;

  valueCents: number;
  treated: boolean;
  createdAt: string;

  // optionnel (ex: copier un message)
  messageToCopy?: string;
};

export type AuditScore = {
  score30d: number;
  streakDays: number;
  goalWeekly: number;
  goalRemainingCount: number;
};

export type AuditStats = {
  untreatedCount: number;
  treatedCount: number;
  totalCount: number;
  potential30dCents: number;
  recovered30dCents: number;
};

export type AuditHistoryItem = {
  id: string;
  dateLabel: string;
  status: "SUCCESS" | "FAILED" | "RUNNING";
  message: string;
};
