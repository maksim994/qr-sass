import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { createYookassaPayment } from "@/lib/yookassa";

export async function POST(req: NextRequest) {
  const prisma = getDb();
  try {
    const user = await getApiUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaces = user.memberships;

    const body = await req.json();
    const { workspaceId, planId } = body;

    if (!workspaceId || !planId) {
      return NextResponse.json({ error: "Missing workspaceId or planId" }, { status: 400 });
    }

    const membership = workspaces.find((w) => w.workspaceId === workspaceId);
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // В реальном проекте цена должна браться из БД или конфига
    let amount = 0;
    if (planId === "PRO") amount = 990;
    else if (planId === "BUSINESS") amount = 2990;
    else return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const paymentData = await createYookassaPayment(
      amount,
      `Оплата тарифа ${planId} для ${workspaceId}`,
      { workspaceId, planId, userId: user.id }
    );

    await prisma.payment.create({
      data: {
        workspaceId,
        providerPaymentId: paymentData.id,
        amount,
        status: "PENDING",
        description: `Оплата тарифа ${planId}`,
      },
    });

    return NextResponse.json({ token: paymentData.confirmation.confirmation_token });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
