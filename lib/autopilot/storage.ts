// lib/autopilot/storage.ts
import type { AutoPilotLogEntry } from "./types";

const LOCK_PREFIX = "autopilot:lock:";
const LOG_PREFIX = "autopilot:log:";

export function acquireLock(key: string, ttlMs: number): boolean {
  try {
    const now = Date.now();
    const lockKey = `${LOCK_PREFIX}${key}`;
    const raw = localStorage.getItem(lockKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { expiresAt: number };
      if (parsed.expiresAt > now) return false;
    }
    localStorage.setItem(lockKey, JSON.stringify({ expiresAt: now + ttlMs }));
    return true;
  } catch {
    return true; // fail-open UX
  }
}

export function releaseLock(key: string) {
  try {
    localStorage.removeItem(`${LOCK_PREFIX}${key}`);
  } catch {}
}

export function appendLog(key: string, entry: AutoPilotLogEntry) {
  try {
    const logKey = `${LOG_PREFIX}${key}`;
    const raw = localStorage.getItem(logKey);
    const arr = raw ? (JSON.parse(raw) as AutoPilotLogEntry[]) : [];
    arr.push(entry);
    localStorage.setItem(logKey, JSON.stringify(arr.slice(-200)));
  } catch {}
}

export function lastLogMatching(
  key: string,
  predicate: (e: AutoPilotLogEntry) => boolean
): AutoPilotLogEntry | null {
  try {
    const raw = localStorage.getItem(`${LOG_PREFIX}${key}`);
    const arr = raw ? (JSON.parse(raw) as AutoPilotLogEntry[]) : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i])) return arr[i];
    }
    return null;
  } catch {
    return null;
  }
}
