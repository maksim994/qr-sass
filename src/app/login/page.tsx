"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiResponse } from "@/lib/client-api";
import { logger } from "@/lib/logger";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const parsed = await parseApiResponse<{ userId?: string }>(response);
    setLoading(false);
    if (!parsed.ok) {
      logger.warn({
        area: "ui",
        route: "/login",
        message: "Login request failed",
        code: parsed.code ?? "REQUEST_ERROR",
        status: parsed.status,
        details: { email },
      });
      setError(parsed.error ?? "Не удалось войти. Проверьте данные.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-[480px] lg:px-16">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
          qr-s.ru
        </Link>

        <div className="mt-12">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Вход в аккаунт</h1>
          <p className="mt-2 text-sm text-slate-500">
            Войдите, чтобы управлять QR-кодами и аналитикой.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
            Зарегистрироваться
          </Link>
        </p>
      </div>

      {/* Right — Decorative */}
      <div className="relative hidden flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
          <div className="absolute inset-0 opacity-20">
            <svg className="h-full w-full" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
              <defs>
                <radialGradient id="login-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="400" cy="300" r="300" fill="url(#login-glow)" />
              <circle cx="600" cy="600" r="200" fill="url(#login-glow)" />
            </svg>
          </div>
          <div className="relative flex h-full flex-col items-center justify-center px-12 text-center text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold">Управляйте QR-кодами</h2>
            <p className="mt-3 max-w-sm text-blue-100">
              Создавайте, кастомизируйте и отслеживайте эффективность ваших QR-кампаний в одном месте.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
