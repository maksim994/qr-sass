export const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || "";
export const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || "";

export async function createYookassaPayment(amount: number, description: string, returnUrl: string, metadata: Record<string, string>) {
  const idempotencyKey = crypto.randomUUID();
  
  const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": idempotencyKey,
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: {
        value: amount.toFixed(2),
        currency: "RUB",
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: returnUrl,
      },
      description,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YooKassa error: ${error}`);
  }

  return response.json();
}
