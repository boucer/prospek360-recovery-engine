// app/api/admin/login/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD manquant dans .env" },
      { status: 500 }
    );
  }

  if (!password || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe invalide." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // secure: true en prod (https)
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14, // 14 jours
  });

  return res;
}
