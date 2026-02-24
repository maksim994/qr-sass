"use client";

import { useState } from "react";

type Props = {
  code: string;
  redirectTo: string;
  error?: string;
};

export function PasswordGateForm({ code, redirectTo, error }: Props) {
  const [loading, setLoading] = useState(false);
  const errMsg = error === "invalid_password" ? "Неверный пароль. Попробуйте ещё раз." : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-7 w-7 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Введите пароль</h1>
        {errMsg ? <p className="mt-2 text-sm text-red-600">{errMsg}</p> : null}
        <form
          method="post"
          action="/api/qr/verify-password"
          onSubmit={() => setLoading(true)}
          className="mt-6 flex flex-col gap-4"
        >
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input
            type="password"
            name="password"
            placeholder="Пароль"
            required
            className="input"
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Проверка…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
