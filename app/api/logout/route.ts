// app/api/logout/route.ts
import { NextResponse } from "next/server";
import { TENANT_COOKIE } from "@/lib/tenant";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // ✅ méthode la plus robuste
  res.cookies.delete(TENANT_COOKIE);

  // ✅ double sécurité : overwrite + expire avec les mêmes options que setTenantCookie
  res.cookies.set({
    name: TENANT_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  });

  return res;
}
