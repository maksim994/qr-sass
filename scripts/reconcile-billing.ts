import { reconcilePendingPayments } from "../src/lib/billing-reconcile.ts";

async function main() {
  const providerPaymentId = process.argv[2]?.trim();
  const result = await reconcilePendingPayments({
    providerPaymentId: providerPaymentId || undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
