import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    if (!id) return Response.json({ ok: false, error: "missing id" }, { status: 400 });

    await prisma.recoveryFinding.update({
      where: { id },
      data: {
        autopilotQueued: true,
        autopilotQueuedAt: new Date(),
      },
      select: { id: true },
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
