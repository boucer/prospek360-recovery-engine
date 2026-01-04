import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const updated = await prisma.recoveryFinding.update({
      where: { id },
      data: {
        handled: false,
        handledAt: null, // ✅ on annule la fenêtre Undo
      },
      select: {
        id: true,
        handled: true,
        handledAt: true,
      },
    });

    return Response.json({ ok: true, data: updated });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message ?? "unhandle_failed" },
      { status: 400 }
    );
  }
}
