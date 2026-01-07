// lib/adminAuth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "admin_auth";

/**
 * Next 16.1+ : cookies() peut être async (Promise).
 * On centralise ici pour éviter les erreurs cookies().get is not a function
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const jar = await cookies();
    const v = jar.get(ADMIN_COOKIE)?.value;
    return v === "1";
  } catch {
    return false;
  }
}

/**
 * Protège une page/route admin.
 * - Sans argument : redirect /admin/login
 * - Avec argument : redirect /admin/login?next=...
 */
export async function requireAdmin(nextPath?: string): Promise<void> {
  const ok = await isAdmin();
  if (ok) return;

  const next = nextPath ? encodeURIComponent(nextPath) : "";
  redirect(next ? `/admin/login?next=${next}` : "/admin/login");
}

/**
 * Helper pour clear la session admin (optionnel)
 */
export function clearAdminCookie() {
  // NB: cookies() est async côté Next 16, donc on laisse ça au route handler si besoin.
}
