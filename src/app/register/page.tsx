"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiResponse } from "@/lib/client-api";
import { logger } from "@/lib/logger";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, workspaceName, email, password }),
    });
    const parsed = await parseApiResponse<{ userId?: string }>(response);
    setLoading(false);
    if (!parsed.ok) {
      logger.warn({
        area: "ui",
        route: "/register",
        message: "Register request failed",
        code: parsed.code ?? "REQUEST_ERROR",
        status: parsed.status,
        details: { email },
      });
      setError(parsed.error ?? "Не удалось создать аккаунт.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Decorative */}
      <div className="relative hidden flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-blue-600 to-blue-500">
          <div className="absolute inset-0 opacity-20">
            <svg className="h-full w-full" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
              <defs>
                <radialGradient id="reg-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="300" cy="400" r="350" fill="url(#reg-glow)" />
              <circle cx="650" cy="200" r="200" fill="url(#reg-glow)" />
            </svg>
          </div>
          <div className="relative flex h-full flex-col items-center justify-center px-12 text-center text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold">Бесплатный старт</h2>
            <p className="mt-3 max-w-sm text-white/90">
              Создайте аккаунт за 30 секунд и начните генерировать QR-коды прямо сейчас. Без кредитной карты.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-left text-sm text-white">
              <div className="flex items-center gap-2 text-white/90">
                <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                10 QR бесплатно
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Экспорт PNG
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Кастомизация
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Без ограничений
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-[520px] lg:px-16">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
          qr-s.ru
        </Link>

        <div className="mt-12">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Создать аккаунт</h1>
          <p className="mt-2 text-sm text-slate-500">
            Начните с бесплатного тарифа за пару секунд.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Имя</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Петров"
                required
              />
            </div>
            <div>
              <label className="label">Рабочее пространство</label>
              <input
                className="input"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Моя команда"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              minLength={8}
              required
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Создание..." : "Создать аккаунт"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
