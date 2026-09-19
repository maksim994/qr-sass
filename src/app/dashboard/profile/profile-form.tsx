"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { Alert } from "@/components/ui";
import { MSG } from "@/lib/user-messages";
import styles from "./profile.module.css";

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

  const pending = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState({ name: initialName, email: initialEmail });
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
      setFlash({ variant: "danger", message });
      router.replace("/dashboard/profile");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (flash) feedbackRef.current?.focus();
  }, [flash]);

  function resetForm() {
    setName(saved.name);
    setEmail(saved.email);
    setFlash(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (pending.current) return;
    pending.current = true;
    setFlash(null);
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
        throw new Error(json.error ?? MSG.PROFILE_AVATAR_FAILED);
      }
      setAvatarUrl(json.data?.avatarUrl ?? null);
      router.refresh();
    } catch (err) {
      setFlash({ variant: "danger", message: err instanceof Error ? err.message : MSG.PROFILE_AVATAR_FAILED });
    } finally {
      pending.current = false;
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    if (!avatarUrl) return;
    if (!confirm("Удалить аватар?")) return;

    if (pending.current) return;
    pending.current = true;
    setFlash(null);
    setUploadingAvatar(true);
    try {
      const res = await fetchApi("/api/user/profile/avatar", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? MSG.PROFILE_AVATAR_DELETE_FAILED);
      }
      setAvatarUrl(null);
      router.refresh();
    } catch (err) {
      setFlash({ variant: "danger", message: err instanceof Error ? err.message : MSG.PROFILE_AVATAR_DELETE_FAILED });
    } finally {
      pending.current = false;
      setUploadingAvatar(false);
    }
  }

  async function handleUnlinkYandex() {
    if (!unlinkPassword) {
      setFlash({ variant: "warning", message: MSG.PROFILE_UNLINK_PASSWORD });
      return;
    }
    if (!confirm("Отвязать аккаунт Яндекса? Вход через Яндекс будет недоступен.")) return;

    if (pending.current) return;
    pending.current = true;
    setFlash(null);
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
        throw new Error((data as { error?: string })?.error ?? MSG.PROFILE_UNLINK_FAILED);
      }
      setYandexLinked(false);
      setUnlinkPassword("");
      setFlash({ variant: "success", message: "Аккаунт Яндекса отвязан." });
      router.refresh();
    } catch (err) {
      setFlash({ variant: "danger", message: err instanceof Error ? err.message : MSG.PROFILE_UNLINK_FAILED });
    } finally {
      pending.current = false;
      setUnlinking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (name.trim().length < 2) {
      setFlash({ variant: "warning", message: MSG.PROFILE_NAME_INVALID });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFlash({ variant: "warning", message: MSG.PROFILE_EMAIL_INVALID });
      return;
    }

    if (email.trim().toLowerCase() !== saved.email && !currentPassword) {
      setFlash({ variant: "warning", message: MSG.PROFILE_EMAIL_PASSWORD });
      return;
    }

    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setFlash({ variant: "warning", message: MSG.PROFILE_CURRENT_PASSWORD });
        return;
      }
      if (newPassword.length < 8) {
        setFlash({ variant: "warning", message: MSG.PROFILE_PASSWORD_SHORT });
        return;
      }
      if (newPassword !== confirmPassword) {
        setFlash({ variant: "warning", message: MSG.PROFILE_PASSWORD_MISMATCH });
        return;
      }
    }

    if (pending.current) return;
    pending.current = true;
    setFlash(null);
    setSaving(true);
    try {
      const body: {
        name: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        name: name.trim(),
      };
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== saved.email) body.email = normalizedEmail;
      if (currentPassword) body.currentPassword = currentPassword;
      if (newPassword) body.newPassword = newPassword;

      const res = await fetchApi("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string })?.error ?? MSG.PROFILE_SAVE_FAILED);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved({ name: body.name, email: normalizedEmail });
      setName(body.name);
      setEmail(normalizedEmail);
      setFlash({ variant: "success", message: "Профиль обновлён." });
      router.refresh();
    } catch (err) {
      setFlash({ variant: "danger", message: err instanceof Error ? err.message : MSG.PROFILE_SAVE_FAILED });
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  const displayName = saved.name.trim() || saved.email;
  const busy = saving || uploadingAvatar || unlinking;
  const emailChanged = email.trim().toLowerCase() !== saved.email;
  const dirty = name.trim() !== saved.name || emailChanged || !!newPassword || !!confirmPassword;
  const currentPasswordField = <label className={styles.field}><span>Текущий пароль</span><input type="password" className="fk-input" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password" /></label>;

  return <div className={styles.stack}>
    {flash && <div ref={feedbackRef} tabIndex={-1} className={styles.feedback}><Alert variant={flash.variant} onClose={()=>setFlash(null)}>{flash.message}</Alert></div>}
    <section className={`${styles.panel} ${styles.identity}`} aria-label="Фото профиля">
      <button type="button" className={styles.avatar} onClick={()=>fileRef.current?.click()} disabled={busy} aria-label="Загрузить аватар">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt=""/>
        ) : nameInitial(saved.name,saved.email)}
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} hidden/>
      <div className={styles.identityText}><h2>{displayName}</h2><p>{subtitle}</p><div className={styles.photoActions}><button type="button" className="fk-button fk-button--secondary fk-button--sm" disabled={busy} onClick={()=>fileRef.current?.click()}>{uploadingAvatar?"Обновление…":"Изменить фото"}</button>{avatarUrl&&<button type="button" className="fk-button fk-button--ghost fk-button--sm" disabled={busy} onClick={removeAvatar}>Удалить фото</button>}</div><small>JPG, PNG, WebP или GIF · до 2 МБ</small></div>
    </section>
    <form onSubmit={handleSubmit} className={styles.panel} aria-labelledby="personal-title">
      <h2 id="personal-title">Личные данные</h2><p className={styles.description}>Имя в аккаунте и email для входа.</p>
      <fieldset disabled={busy} className={styles.fields}>
        <label className={styles.field}><span>Имя</span><input className="fk-input" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={120} required autoComplete="name" placeholder="Ваше имя"/></label>
        <label className={styles.field}><span>Email</span><input className="fk-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" disabled={!canChangePassword}/></label>
        {!canChangePassword&&<p className={styles.hint}>Для аккаунта Telegram смена email и пароля недоступна.</p>}
        {emailChanged&&<div className={styles.emailConfirm}>{currentPasswordField}<p className={styles.hint}>Подтвердите смену email текущим паролем.</p></div>}
        {canChangePassword&&<details className={styles.security}><summary>Изменить пароль</summary><p className={styles.hint}>Заполните эти поля, только если хотите установить новый пароль.</p><div className={styles.passwordFields}>
          {!emailChanged&&currentPasswordField}
          <label className={styles.field}><span>Новый пароль</span><input className="fk-input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" minLength={8}/><small>Не менее 8 символов</small></label>
          <label className={styles.field}><span>Подтвердите новый пароль</span><input className="fk-input" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password"/></label>
        </div></details>}
      </fieldset>
      <div className={styles.actions}><button type="submit" disabled={busy||!dirty} className="fk-button fk-button--primary">{saving?"Сохранение…":"Сохранить изменения"}</button><button type="button" disabled={busy||(!dirty&&!currentPassword)} onClick={resetForm} className="fk-button fk-button--ghost">Отменить изменения</button></div>
    </form>
    {yandexAuthEnabled&&<section className={styles.panel} aria-labelledby="yandex-title"><div className={styles.sectionHead}><h2 id="yandex-title">Вход через Яндекс</h2><span>{yandexLinked?"Подключён":"Не подключён"}</span></div><p className={styles.description}>{yandexLinked?"Вы можете входить в аккаунт с помощью Яндекс ID.":"Подключите Яндекс ID, чтобы входить без ввода пароля."}</p>
      {yandexLinked?<details className={styles.security}><summary>Отключить Яндекс ID</summary><p className={styles.hint}>После отключения используйте email и пароль для входа.</p><div className={styles.passwordFields}><label className={styles.field}><span>Пароль для отвязки</span><input type="password" className="fk-input" value={unlinkPassword} onChange={e=>setUnlinkPassword(e.target.value)} autoComplete="current-password" disabled={busy}/></label><button type="button" onClick={handleUnlinkYandex} disabled={busy} className="fk-button fk-button--secondary">{unlinking?"Отключение…":"Отключить Яндекс"}</button></div></details>:<Link href="/api/auth/yandex?mode=link" className="fk-button fk-button--secondary">Подключить Яндекс</Link>}
    </section>}
  </div>;
}
