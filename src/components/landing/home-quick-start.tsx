"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HomeQrPreview } from "@/components/landing/home-qr-preview";
import { createQrContinuePath, normalizeDraftUrl, QR_DRAFT_MAX_URL, writeQrCreateDraft } from "@/lib/qr-draft";
import { MSG } from "@/lib/user-messages";
import styles from "@/app/home.module.css";

type Props = {
  signedIn: boolean;
  urlEnabled: boolean;
  otherTypes: { type: string; label: string; icon: string }[];
};

export function HomeQuickStart({ signedIn, urlEnabled, otherTypes }: Props) {
  const router = useRouter();
  const id = useId();
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const normalized = normalizeDraftUrl(url);
  const preview = useMemo(() => <HomeQrPreview value={normalized ?? "https://qr-s.ru"} />, [normalized]);
  const destination = (path: string) => signedIn ? path : `/register?next=${encodeURIComponent(path)}`;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalized) {
      setError(MSG.INVALID_PAYLOAD_URL);
      return;
    }
    const draft = { v: 1 as const, contentType: "URL" as const, url: normalized, kind };
    writeQrCreateDraft(draft);
    setPending(true);
    router.push(destination(createQrContinuePath(draft)));
  }

  return (
    <div className={styles.generator} id="create-qr">
      <nav className={styles.typeNav} aria-label="Что будет в QR-коде">
        {urlEnabled && <a href="#create-qr" className={styles.selectedType} aria-current="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m10 13 4-4M8 15l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0m2 1 2-2a3 3 0 0 1 4 4l-5 5a3 3 0 0 1-4 0" /></svg>Ссылка</a>}
        {otherTypes.map(type => <Link key={type.type} href={destination(`/dashboard/create/${type.type.toLowerCase()}`)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d={type.icon} /></svg>{type.label}</Link>)}
        <Link href={destination("/dashboard/create")} className={styles.allTypes}>Все типы <span aria-hidden="true">↗</span></Link>
      </nav>
      {urlEnabled ? <div className={styles.generatorBody}>
        <form onSubmit={submit} className={styles.generatorForm}>
          <label htmlFor={id}>Куда ведёт ваш QR-код?</label>
          <Input id={id} value={url} onChange={event => { setUrl(event.target.value); setError(""); }} placeholder="https://ваш-сайт.ru" inputMode="url" autoComplete="url" spellCheck={false} maxLength={QR_DRAFT_MAX_URL} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : `${id}-hint`} required />
          {error ? <p className={styles.formError} id={`${id}-error`} role="alert">{error}</p> : <p id={`${id}-hint`} className={styles.inputHint}>Добавьте ссылку на сайт, меню или страницу в соцсети.</p>}
          <fieldset className={styles.kindChoice}>
            <legend className="sr-only">Тип QR-кода</legend>
            <label><input type="radio" name={`${id}-kind`} checked={kind === "STATIC"} onChange={() => setKind("STATIC")} />Обычный <span>Бесплатно</span></label>
            <label><input type="radio" name={`${id}-kind`} checked={kind === "DYNAMIC"} onChange={() => setKind("DYNAMIC")} />Динамический <span>Про</span></label>
          </fieldset>
          <p className={styles.kindHint}>{kind === "STATIC" ? "Ссылка сохранится в коде навсегда." : "Меняйте ссылку после печати. Доступно на Про, пробный период — 14 дней."}</p>
          <div className={styles.generatorAction}><Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>{pending ? "Открываем…" : "Создать QR-код"}<span aria-hidden="true">→</span></Button><span>{signedIn ? "Оформление и скачивание — на следующем шаге" : "Продолжим после регистрации"}</span></div>
        </form>
        <div className={styles.generatorPreview}>
          <div className={styles.previewTop}><span>Ваш QR-код</span><span>{normalized ? "Предпросмотр" : "Пример"}</span></div>
          {preview}
          <p>{kind === "DYNAMIC" ? "Готовый динамический код появится после сохранения" : normalized ? "Ссылка готова. Осталось сохранить код." : "Введите ссылку — код обновится"}</p>
        </div>
      </div> : <div className={styles.generatorUnavailable}><p>Выберите тип QR-кода, чтобы начать.</p><Button href={destination("/dashboard/create")} variant="primary">Перейти к созданию →</Button></div>}
    </div>
  );
}
