"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { parseApiResponse, fetchApi } from "@/lib/client-api";
import { logger } from "@/lib/logger";

type Props = {
  planName: string;
  features: string[];
};

export function RegisterPageClient({ planName, features }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetchApi("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, workspaceName, email, password, consent }),
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
      <div className="relative hidden lg:block lg:w-1/2">
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
            <Logo href="/" size="lg" inverted />
            <h2 className="mt-6 text-2xl font-bold">Тариф «{planName}»</h2>
            <p className="mt-3 max-w-sm text-white/90">
              Создайте аккаунт за 30 секунд и начните генерировать QR-коды прямо сейчас. Без кредитной карты.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-left text-sm text-white">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-white/90">
                  <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <Logo href="/" size="md" />

        <div className="mt-12">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Создать аккаунт</h1>
          <p className="mt-2 text-sm text-slate-500">
            Начните с тарифа «{planName}» за пару секунд.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
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
              <label className="label leading-snug">
                Рабочее пространство{" "}
                <span className="font-normal text-slate-400">(необязательно)</span>
              </label>
              <input
                className="input"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Моя команда"
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

          <div className="flex items-start gap-2 mt-4">
            <input
              type="checkbox"
              id="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              required
            />
            <label htmlFor="consent" className="text-sm text-slate-500">
              Я согласен на{" "}
              <Link href="/privacy-policy" className="text-blue-600 hover:underline" target="_blank">
                обработку персональных данных
              </Link>{" "}
              и принимаю условия{" "}
              <Link href="/terms-of-service" className="text-blue-600 hover:underline" target="_blank">
                Пользовательского соглашения
              </Link>
            </label>
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
