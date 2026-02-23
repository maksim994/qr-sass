"use client";

import { useState } from "react";
import { parseApiResponse } from "@/lib/client-api";
import { logger } from "@/lib/logger";

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
  const [status, setStatus] = useState("Нажмите кнопку для авторизации через Telegram.");

  async function connect() {
    const initDataRaw = window.Telegram?.WebApp?.initData;
    if (!initDataRaw) {
      setStatus("Telegram WebApp initData недоступен.");
      return;
    }

    const response = await fetch("/api/telegram/auth", {
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
      setStatus(`Ошибка авторизации: ${parsed.error ?? "неизвестная ошибка"}`);
      return;
    }
    setStatus("Авторизация через Telegram прошла успешно. Перейдите в панель управления.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="card mx-auto w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
          <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Telegram Mini App</h1>
        <p className="mt-2 text-sm text-slate-500">
          Авторизация через Telegram для доступа к вашему рабочему пространству qr-s.ru.
        </p>
        <button onClick={connect} className="btn btn-primary mt-6 w-full">
          Подключить Telegram
        </button>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {status}
        </div>
      </div>
    </div>
  );
}
