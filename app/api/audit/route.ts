import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Endpoint /api/audit OK. Utilise POST pour déclencher un audit.",
  });
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Audit déclenché (stub V1).",
  });
}
