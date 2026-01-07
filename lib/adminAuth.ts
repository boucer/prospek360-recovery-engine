// lib/adminAuth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const v = store.get("admin_auth")?.value;
  return v === "1";
}

export async function requireAdmin() {
  const ok = await isAdmin();
  if (!ok) redirect("/admin/login?next=/admin");
}
