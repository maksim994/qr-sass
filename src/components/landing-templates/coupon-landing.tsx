"use client";

import { useState } from "react";
import { QreateFooter } from "./qreate-footer";

type Props = { payload: Record<string, unknown> };

export function CouponLanding({ payload }: Props) {
  const title = (payload.title as string) || "Купон";
  const description = payload.description as string | undefined;
  const discount = payload.discount as string | number | undefined;
  const promoCode = payload.promoCode as string | undefined;
  const expiryDate = payload.expiryDate as string | undefined;
  const terms = payload.terms as string | undefined;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-gray-100">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-8 text-center text-white">
          {discount != null && (
            <p className="text-5xl font-extrabold tracking-tight">
              {typeof discount === "number" ? `-${discount}%` : discount}
            </p>
          )}
          <h1 className="mt-3 text-xl font-bold">{title}</h1>
          {description && <p className="mt-2 text-sm text-blue-100">{description}</p>}
        </div>

        <div className="space-y-5 p-6">
          {promoCode && <CopyableCode code={promoCode} />}

          {expiryDate && (
            <p className="text-center text-sm text-gray-500">
              Действителен до: <span className="font-medium text-gray-700">{expiryDate}</span>
            </p>
          )}

          {terms && (
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Условия</p>
              <p className="mt-1 text-sm text-gray-600">{terms}</p>
            </div>
          )}
        </div>
      </div>

      <QreateFooter />
    </div>
  );
}

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex w-full items-center justify-between rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 px-5 py-4 transition-colors hover:border-blue-300"
    >
      <span className="font-mono text-lg font-bold tracking-widest text-blue-700">{code}</span>
      <span className="text-xs font-medium text-blue-500">
        {copied ? "Скопировано" : "Копировать"}
      </span>
    </button>
  );
}
