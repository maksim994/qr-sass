import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// YooKassa IPs for webhook verification
const YOOKASSA_IPS = [
  "185.71.76.0/27",
  "185.71.77.0/27",
  "77.75.153.0/25",
  "77.75.156.11",
  "77.75.156.35",
  "77.75.154.128/25",
  "2a02:5180::/32",
];

export async function POST(req: NextRequest) {
  const prisma = getDb();
  try {
    // В реальном проекте здесь нужно проверять IP-адрес отправителя (req.ip)
    // на соответствие YOOKASSA_IPS

    const body = await req.json();

    if (body.event === "payment.succeeded") {
      const paymentObj = body.object;
      const providerPaymentId = paymentObj.id;
      const metadata = paymentObj.metadata;

      const payment = await prisma.payment.findUnique({
        where: { providerPaymentId },
      });

      if (payment && payment.status !== "SUCCEEDED") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED" },
        });

        const workspaceId = metadata.workspaceId;
        const planId = metadata.planId;

        if (workspaceId && planId) {
          // Обновляем подписку
          const currentPeriodEnd = new Date();
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

          await prisma.subscription.upsert({
            where: { workspaceId },
            create: {
              workspaceId,
              plan: planId,
              currentPeriodEnd,
            },
            update: {
              plan: planId,
              currentPeriodEnd,
              status: "active",
            },
          });

          // Обновляем план в Workspace (для обратной совместимости)
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: { plan: planId },
          });
        }
      }
    } else if (body.event === "payment.canceled") {
      const paymentObj = body.object;
      const providerPaymentId = paymentObj.id;

      await prisma.payment.updateMany({
        where: { providerPaymentId },
        data: { status: "CANCELED" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
