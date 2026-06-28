import { NextRequest, NextResponse } from "next/server";
import { MSG } from "@/lib/user-messages";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.sub) {
      return NextResponse.json({ error: MSG.UNAUTHORIZED }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: MSG.WORKSPACE_ID_REQUIRED }, { status: 400 });
    }

    const db = getDb();

    const membership = await db.membership.findFirst({
      where: {
        userId: session.sub,
        workspaceId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      include: {
        workspace: { select: { id: true, trialUsedAt: true, plan: true } },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: MSG.FORBIDDEN }, { status: 403 });
    }

    const { workspace } = membership;
    if (workspace.trialUsedAt) {
      return NextResponse.json({ error: "Триал уже использован" }, { status: 400 });
    }

    if (workspace.plan === "PRO" || workspace.plan === "BUSINESS") {
      return NextResponse.json({ error: "У вас уже платный тариф" }, { status: 400 });
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);

    await db.$transaction([
      db.workspace.update({
        where: { id: workspaceId },
        data: {
          plan: "PRO",
          trialUsedAt: now,
        },
      }),
      db.subscription.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          plan: "PRO",
          status: "trial",
          currentPeriodEnd: trialEnd,
        },
        update: {
          plan: "PRO",
          status: "trial",
          currentPeriodEnd: trialEnd,
        },
      }),
    ]);

    return NextResponse.json({ success: true, redirect: "/dashboard" });
  } catch (error) {
    console.error("Trial error:", error);
    return NextResponse.json({ error: MSG.INTERNAL_ERROR }, { status: 500 });
  }
}
