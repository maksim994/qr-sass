"use client";

import { useState } from "react";
import {
  HostedLandingCard,
  HostedLandingShell,
} from "./hosted-landing-shell";

type Props = { payload: Record<string, unknown> };

export function CouponLanding({ payload }: Props) {
  const title = (payload.title as string) || "Купон";
  const description = payload.description as string | undefined;
  const discount = payload.discount as string | number | undefined;
  const promoCode = payload.promoCode as string | undefined;
  const expiryDate = payload.expiryDate as string | undefined;
  const terms = payload.terms as string | undefined;

  return (
    <HostedLandingShell>
      <HostedLandingCard className="qrs-hosted-coupon">
        <div className="qrs-hosted-coupon__hero">
          {discount != null ? (
            <p className="qrs-hosted-coupon__discount">
              {typeof discount === "number" ? `-${discount}%` : discount}
            </p>
          ) : null}
          <h1 className="qrs-hosted-coupon__title">{title}</h1>
          {description ? <p className="qrs-hosted-coupon__desc">{description}</p> : null}
        </div>

        <div className="qrs-hosted-coupon__body">
          {promoCode ? <CopyableCode code={promoCode} /> : null}

          {expiryDate ? (
            <p className="qrs-hosted-coupon__expiry">
              Действителен до: <strong>{expiryDate}</strong>
            </p>
          ) : null}

          {terms ? (
            <div className="qrs-hosted-coupon__terms">
              <p className="qrs-hosted-coupon__terms-label">Условия</p>
              <p>{terms}</p>
            </div>
          ) : null}
        </div>
      </HostedLandingCard>
    </HostedLandingShell>
  );
}

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <button type="button" onClick={handleCopy} className="qrs-hosted-coupon__code">
      <span className="qrs-hosted-coupon__code-value">{code}</span>
      <span className="qrs-hosted-coupon__code-action">{copied ? "Скопировано" : "Копировать"}</span>
    </button>
  );
}
