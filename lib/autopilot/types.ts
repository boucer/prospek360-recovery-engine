// lib/autopilot/types.ts

export type AutoPilotFindingType =
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "ACTIVATION_MISSING"
  | "NO_REPLY"
  | "INACTIVE_CLIENT"
  | "FOLLOW_UP_REQUIRED"
  | "LOW_CONFIDENCE"
  | (string & {});

export type AutoPilotActionKind =
  | "MARK_TREATED"
  | "SEND_SMS"
  | "SEND_EMAIL"
  | "CREATE_TASK"
  | "STOP";

export type AutoPilotChannel = "SMS" | "EMAIL" | "TASK" | "NONE";

export type AutoPilotStatus = "SUCCESS" | "FAILED" | "BLOCKED" | "SKIPPED";

export type AutoPilotBlockReason =
  | "ALREADY_RUNNING"
  | "ALREADY_TREATED"
  | "MISSING_CONTACT"
  | "OPTOUT"
  | "COOLDOWN_ACTIVE"
  | "MISSING_TEMPLATE"
  | "MISSING_REQUIRED_VARS"
  | "CONCURRENCY_CHANGED"
  | "UNKNOWN";

export type AutoPilotContact = {
  phone?: string | null;
  email?: string | null;
  optOut?: boolean; // DNC / unsub / etc.
};

export type AutoPilotContext = {
  opportunityId: string;
  findingId?: string;

  findingType: AutoPilotFindingType;
  severity: number; // 1..5
  treated?: boolean;

  contact: AutoPilotContact;

  invoiceAmount?: number | null;
  paymentLink?: string | null;
  lastAttemptAt?: string | null; // ISO
  neverActivated?: boolean;
  lastContactAt?: string | null;
  lastActivityAt?: string | null;

  title?: string;
};

export type AutoPilotDecision = {
  kind: AutoPilotActionKind;
  channel: AutoPilotChannel;
  cooldownHours?: number;
  summaryLabel: string;
  templateKey?: string;
  requiredVars?: Array<keyof AutoPilotContext>;
};

export type AutoPilotLogEntry = {
  ts: string; // ISO
  source: "AUTO_PILOT";
  opportunityId: string;
  findingId?: string;
  findingType: string;
  action: AutoPilotActionKind;
  channel: AutoPilotChannel;
  status: AutoPilotStatus;
  reason?: AutoPilotBlockReason | string;
  details?: Record<string, any>;
};

export type AutoPilotRunResult = {
  ok: boolean;
  blocked?: boolean;
  blockReason?: AutoPilotBlockReason;
  steps: AutoPilotLogEntry[];
  userSummary: {
    title: string;
    lines: string[];
  };
};
