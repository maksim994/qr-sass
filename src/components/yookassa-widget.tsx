"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type YooMoneyCheckout = {
  on: (event: string, cb: () => void) => void;
  destroy: () => void;
  render: (id: string) => void;
};

type YooMoneyCheckoutWidgetCtor = new (options: {
  confirmation_token: string;
  return_url: string;
  customization?: { colors?: { control_primary?: string; control_primary_content?: string } };
  error_callback?: (error: unknown) => void;
}) => YooMoneyCheckout;

declare global {
  interface Window {
    YooMoneyCheckoutWidget?: YooMoneyCheckoutWidgetCtor;
  }
}

type Props = {
  token: string;
  onSuccess?: () => void;
  onError?: () => void;
};

export function YookassaWidget({ token, onSuccess, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !token) return;
    if (typeof window.YooMoneyCheckoutWidget === "undefined") return;

    containerRef.current.innerHTML = "";

    const checkout = new window.YooMoneyCheckoutWidget({
      confirmation_token: token,
      return_url: window.location.href,
      customization: {
        colors: {
          control_primary: "#2563EB",
          control_primary_content: "#FFFFFF",
        },
      },
      error_callback: function () {
        onError?.();
      },
    });

    checkout.on("success", () => {
      onSuccess?.();
      checkout.destroy();
    });

    checkout.on("fail", () => {
      onError?.();
      checkout.destroy();
    });

    checkout.render("payment-form");

    return () => {
      checkout.destroy();
    };
  }, [isLoaded, token, onSuccess, onError]);

  return (
    <>
      <Script
        src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js"
        onReady={() => setIsLoaded(true)}
        onError={() => onError?.()}
      />
      <div id="payment-form" ref={containerRef} className="w-full min-h-[400px]" />
    </>
  );
}
