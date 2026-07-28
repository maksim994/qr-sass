"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { Alert } from "@/components/ui";

type Props = {
  initialName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
  yandexLinked: boolean;
  yandexAuthEnabled: boolean;
  canChangePassword: boolean;
  subtitle: string;
};

function nameInitial(name: string, email: string): string {
  const source = (name.trim() || email.trim())[0] ?? "?";
  return source.toUpperCase();
}

export function ProfileForm({
  initialName,
  initialEmail,
  initialAvatarUrl,
  yandexLinked: initialYandexLinked,
  yandexAuthEnabled,
  canChangePassword,
  subtitle,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [yandexLinked, setYandexLinked] = useState(initialYandexLinked);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unlinkPassword, setUnlinkPassword] = useState("");
  const [flash, setFlash] = useState<{ variant: "success" | "danger" | "warning"; message: string } | null>(null);

  useEffect(() => {
    const yandexStatus = searchParams.get("yandex");
    const message = searchParams.get("message");
    if (yandexStatus === "linked") {
      setYandexLinked(true);
      setFlash({ variant: "success", message: "Аккаунт Яндекса успешно привязан." });
      router.replace("/dashboard/profile");
    } else if (yandexStatus === "error" && message) {
      setFlash({ variant: "danger", message: decodeURIComponent(message) });
      router.replace("/dashboard/profile");
    }
  }, [searchParams, router]);

  function resetForm() {
    setName(initialName);
    setEmail(initialEmail);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchApi("/api/user/profile/avatar", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { avatarUrl?: string | null }; error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Не удалось загрузить аватар");
      }
      setAvatarUrl(json.data?.avatarUrl ?? null);
      router.refresh();
    } catch (err) {
      setFlash({ variant: "danger", message: err instanceof Error ? err.message : "Не удалось загрузить аватар" });
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    if (!avatarUrl) return;
    if (!confirm("Удалить аватар?")) return;

    setUploadingAvatar(true);
    try {
      const res = await fetchApi("/api/user/profile/avatar", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? "Не удалось удалить аватар");
      }
      setAvatarUrl(null);
      router.refresh();
    } catch (err) {
      setFlash({ variant: "danger", message: err instanceof Error ? err.message : "Не удалось удалить аватар" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleUnlinkYandex() {
    if (!unlinkPassword) {
      setFlash({ variant: "warning", message: "Введите текущий пароль для отвязки Яндекса." });
      return;
    }
    if (!confirm("Отвязать аккаунт Яндекса? Вход через Яндекс будет недоступен.")) return;

    setUnlinking(true);
    try {
      const res = await fetchApi("/api/user/profile/yandex", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: unlinkPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string })?.error ?? "Не удалось отвязать Яндекс");
      }
      setYandexLinked(false);
      setUnlinkPassword("");
      setFlash({ variant: "success", message: "Аккаунт Яндекса отвязан." });
      router.refresh();
    } catch (err) {
      setFlash({ variant: "danger", message: err instanceof Error ? err.message : "Не удалось отвязать Яндекс" });
    } finally {
      setUnlinking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (name.trim().length < 2) {
      setFlash({ variant: "warning", message: "Имя должно быть не менее 2 символов." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFlash({ variant: "warning", message: "Введите корректный email." });
      return;
    }

    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setFlash({ variant: "warning", message: "Введите текущий пароль для смены." });
        return;
      }
      if (newPassword.length < 8) {
        setFlash({ variant: "warning", message: "Новый пароль должен быть не менее 8 символов." });
        return;
      }
      if (newPassword !== confirmPassword) {
        setFlash({ variant: "warning", message: "Новый пароль и подтверждение не совпадают." });
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

      const res = await fetchApi("/api/user/profile", {
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
      setFlash({ variant: "success", message: "Профиль обновлён." });
      router.refresh();
    } catch (err) {
      setFlash({ variant: "danger", message: err instanceof Error ? err.message : "Не удалось сохранить" });
    } finally {
      setSaving(false);
    }
  }

  const displayName = name.trim() || initialName || email;

  return (
    <div className="qrs-profile-card">
      {flash && (
        <Alert variant={flash.variant} onClose={() => setFlash(null)} className="mb-5">
          {flash.message}
        </Alert>
      )}

      <div className="qrs-profile-head">
        <button
          type="button"
          className="qrs-profile-avatar-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploadingAvatar}
          aria-label="Загрузить аватар"
          title="Нажмите, чтобы загрузить фото"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            nameInitial(name, email)
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleAvatarChange}
          style={{ display: "none" }}
        />
        <div>
          <div style={{ font: "var(--fw-bold) 1.15rem/1.2 var(--font-display)", color: "var(--text-strong)" }}>
            {displayName}
          </div>
          <div style={{ marginTop: "4px", font: "var(--fw-regular) 13px/1 var(--font-sans)", color: "var(--text-muted)" }}>
            {subtitle}
          </div>
          {avatarUrl && (
            <button
              type="button"
              onClick={removeAvatar}
              disabled={uploadingAvatar}
              className="qrs-navlink"
              style={{ marginTop: "8px", font: "var(--fw-semibold) 12px/1 var(--font-sans)" }}
            >
              {uploadingAvatar ? "Загрузка…" : "Удалить фото"}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="qrs-profile-fields">
          <label className="qrs-profile-label" htmlFor="name">
            <span className="qrs-profile-label-text">Имя</span>
            <input
              id="name"
              type="text"
              className="qrs-profile-input"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={120}
              required
            />
          </label>

          <label className="qrs-profile-label" htmlFor="email">
            <span className="qrs-profile-label-text">Email</span>
            <input
              id="email"
              type="email"
              className="qrs-profile-input"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {canChangePassword && (
            <>
              <label className="qrs-profile-label" htmlFor="currentPassword">
                <span className="qrs-profile-label-text">Текущий пароль</span>
                <input
                  id="currentPassword"
                  type="password"
                  className="qrs-profile-input"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label className="qrs-profile-label" htmlFor="newPassword">
                <span className="qrs-profile-label-text">Новый пароль</span>
                <input
                  id="newPassword"
                  type="password"
                  className="qrs-profile-input"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label className="qrs-profile-label" htmlFor="confirmPassword">
                <span className="qrs-profile-label-text">Подтвердите новый пароль</span>
                <input
                  id="confirmPassword"
                  type="password"
                  className="qrs-profile-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </>
          )}
        </div>

        <div className="qrs-profile-actions">
          <button type="submit" disabled={saving} className="fk-button fk-button--accent">
            {saving ? "Сохранение…" : "Сохранить изменения"}
          </button>
          <button type="button" onClick={resetForm} className="fk-button fk-button--ghost">
            Отмена
          </button>
        </div>
      </form>

      {yandexAuthEnabled && (
        <div className="qrs-profile-yandex">
          <div className="qrs-profile-yandex-title">Яндекс ID</div>
          <p style={{ marginBottom: "14px", font: "var(--fw-regular) 13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
            {yandexLinked
              ? "Аккаунт Яндекса привязан. Вы можете входить через Яндекс."
              : "Привяжите Яндекс, чтобы входить в сервис одним кликом."}
          </p>
          {yandexLinked ? (
            <div className="qrs-profile-fields" style={{ maxWidth: "360px" }}>
              <label className="qrs-profile-label" htmlFor="unlinkPassword">
                <span className="qrs-profile-label-text">Пароль для отвязки</span>
                <input
                  id="unlinkPassword"
                  type="password"
                  className="qrs-profile-input"
                  placeholder="••••••••"
                  value={unlinkPassword}
                  onChange={(e) => setUnlinkPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <div className="qrs-profile-yandex-row">
                <button
                  type="button"
                  onClick={handleUnlinkYandex}
                  disabled={unlinking}
                  className="fk-button fk-button--secondary"
                >
                  {unlinking ? "Отвязка…" : "Отвязать Яндекс"}
                </button>
              </div>
            </div>
          ) : (
            <Link href="/api/auth/yandex?mode=link" className="fk-button fk-button--secondary">
              Привязать Яндекс
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
