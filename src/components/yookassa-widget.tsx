"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

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

    // @ts-ignore
    if (typeof window.YooMoneyCheckoutWidget === "undefined") return;

    containerRef.current.innerHTML = ""; // Clear previous widget if any

    // @ts-ignore
    const checkout = new window.YooMoneyCheckoutWidget({
      confirmation_token: token,
      return_url: window.location.href, // Fallback
      customization: {
        colors: {
          control_primary: "#2563EB", // blue-600
          control_primary_content: "#FFFFFF",
        },
      },
      error_callback: function(error: any) {
        console.error(error);
        onError?.();
      }
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
        onLoad={() => setIsLoaded(true)}
      />
      <div id="payment-form" ref={containerRef} className="w-full min-h-[400px]" />
    </>
  );
}
