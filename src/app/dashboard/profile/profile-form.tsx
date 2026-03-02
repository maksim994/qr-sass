"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialName: string;
  initialEmail: string;
  canChangePassword: boolean;
};

export function ProfileForm({
  initialName,
  initialEmail,
  canChangePassword,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (name.trim().length < 2) {
      alert("Имя должно быть не менее 2 символов.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      alert("Введите корректный email.");
      return;
    }

    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        alert("Введите текущий пароль для смены.");
        return;
      }
      if (newPassword.length < 8) {
        alert("Новый пароль должен быть не менее 8 символов.");
        return;
      }
      if (newPassword !== confirmPassword) {
        alert("Новый пароль и подтверждение не совпадают.");
        return;
      }
    }

    setSaving(true);
    try {
      const body: {
        name: string;
        email: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      };
      if (newPassword && currentPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string })?.error ?? "Ошибка сохранения");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
      alert("Профиль обновлён.");
    } catch (e) {
      alert((e instanceof Error ? e.message : "Не удалось сохранить") || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="label" htmlFor="name">
          Имя
        </label>
        <input
          id="name"
          type="text"
          className="input"
          placeholder="Ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={120}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="input"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          На этот адрес приходят уведомления и восстановление доступа.
        </p>
      </div>

      {canChangePassword && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Смена пароля</h2>
          <p className="text-xs text-slate-500">
            Оставьте поля пустыми, если не хотите менять пароль.
          </p>
          <div>
            <label className="label" htmlFor="currentPassword">
              Текущий пароль
            </label>
            <input
              id="currentPassword"
              type="password"
              className="input"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="newPassword">
              Новый пароль
            </label>
            <input
              id="newPassword"
              type="password"
              className="input"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">
              Подтвердите новый пароль
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
      )}

      <button type="submit" disabled={saving} className="btn btn-primary">
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}
