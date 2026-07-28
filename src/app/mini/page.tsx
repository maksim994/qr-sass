"use client";

import { useState } from "react";
import { parseApiResponse, fetchApi } from "@/lib/client-api";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { UtilityPage } from "@/components/utility/utility-page";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
      };
    };
  }
}

export default function MiniAppPage() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("Нажмите кнопку для авторизации через Telegram.");

  async function connect() {
    const initDataRaw = window.Telegram?.WebApp?.initData;
    if (!initDataRaw) {
      setStatus("error");
      setMessage("Telegram WebApp initData недоступен. Откройте страницу из Telegram Mini App.");
      return;
    }

    const response = await fetchApi("/api/telegram/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initDataRaw }),
    });
    const parsed = await parseApiResponse<{ userId?: string; fallback?: boolean }>(response);
    if (!parsed.ok) {
      logger.warn({
        area: "ui",
        route: "/mini",
        message: "Telegram authorization failed",
        code: parsed.code ?? "REQUEST_ERROR",
        status: parsed.status,
      });
      setStatus("error");
      setMessage(`Ошибка авторизации: ${parsed.error ?? "неизвестная ошибка"}`);
      return;
    }
    setStatus("success");
    setMessage("Авторизация через Telegram прошла успешно. Перейдите в панель управления.");
  }

  return (
    <UtilityPage
      variant="brand"
      title="Telegram Mini App"
      description="Авторизация через Telegram для доступа к вашему рабочему пространству QR-S.ru."
    >
      <Button type="button" variant="primary" block onClick={connect}>
        Подключить Telegram
      </Button>
      <Alert variant={status === "error" ? "danger" : status === "success" ? "success" : "info"} className="qrs-utility-status">
        {message}
      </Alert>
    </UtilityPage>
  );
}
