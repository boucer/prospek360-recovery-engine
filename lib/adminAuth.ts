import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "admin_auth";

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value === "1";
}

export async function requireAdmin(nextPath: string = "/admin"): Promise<void> {
  const ok = await isAdmin();
  if (!ok) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
}
