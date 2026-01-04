import { NextResponse } from "next/server";

// 👇 Optionnel mais recommandé : GET explicatif
export async function GET() {
  return NextResponse.json({
    ok: true,
    info: "POST only — this endpoint is used by Auto-Pilot Recovery.",
    usage: "POST /api/recovery/mark-treated",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    console.log("[MOCK] mark-treated", {
      opportunityId: body?.opportunityId,
      findingId: body?.findingId,
      at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mocked: true,
      treatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
