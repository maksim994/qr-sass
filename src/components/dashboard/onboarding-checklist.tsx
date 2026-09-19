"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { dismissOnboarding, hasOnboardingDownloaded, isOnboardingDismissed } from "@/lib/product-analytics";
import styles from "./onboarding-checklist.module.css";

type Props = {
  hasQr: boolean;
  hasDownload: boolean;
  hasFirstExternalOpen: boolean;
  canTrackOpens: boolean;
};

function subscribeNoop() { return () => undefined; }

export function OnboardingChecklist({ hasQr, hasDownload, hasFirstExternalOpen, canTrackOpens }: Props) {
  const dismissedStored = useSyncExternalStore(subscribeNoop, isOnboardingDismissed, () => false);
  const downloaded = useSyncExternalStore(subscribeNoop, hasOnboardingDownloaded, () => false);
  const [dismissedLocal, setDismissedLocal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const steps = [
    { id: "create", title: "Создайте первый QR-код", description: "Начните со ссылки или выберите другой тип содержимого.", href: "/dashboard/create", cta: "Создать", done: hasQr },
    { id: "download", title: "Скачайте готовый код", description: "Выберите формат в библиотеке и проверьте код камерой телефона перед печатью.", href: hasQr ? "/dashboard/library" : "/dashboard/create", cta: hasQr ? "К моим кодам" : "Создать", done: downloaded || hasDownload },
    ...(canTrackOpens ? [{ id: "scan", title: "Посмотрите первые открытия", description: "После перехода по вашему динамическому QR появится статистика. Открытия в режиме проверки не учитываются.", href: "/dashboard/analytics", cta: "Аналитика", done: hasFirstExternalOpen }] : []),
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const current = steps.find((step) => !step.done);
  if (dismissedStored || dismissedLocal || !current) return null;

  return (
    <section className={styles.checklist} aria-label="Первые шаги">
      <div className={styles.head}>
        <h2>Первые шаги <span>{doneCount} из {steps.length}</span></h2>
        <div className={styles.controls}>
          <button type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)}>
            {expanded ? "Свернуть" : "Все шаги"}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" className={expanded ? styles.rotated : undefined}><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <button type="button" className={styles.dismiss} onClick={() => { dismissOnboarding(); setDismissedLocal(true); }}>Скрыть</button>
        </div>
      </div>
      {!expanded && <div className={styles.current}>
        <span className={styles.stepNumber} aria-hidden="true">{steps.indexOf(current) + 1}</span>
        <div className={styles.copy}><h3>{current.title}</h3><p>{current.description}</p></div>
        <Link href={current.href} className={styles.action}>{current.cta}<span aria-hidden="true">→</span></Link>
      </div>}
      <ol id={listId} className={styles.list} hidden={!expanded}>
        {steps.map((step, index) => <li key={step.id}>
          <span className={styles.stepNumber} aria-hidden="true">{step.done ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" /></svg> : index + 1}</span>
          <div className={styles.copy}><h3>{step.title}</h3><p>{step.description}</p></div>
          {step.done ? <span className={styles.done}>Готово</span> : <Link href={step.href} className={styles.action}>{step.cta}<span aria-hidden="true">→</span></Link>}
        </li>)}
      </ol>
    </section>
  );
}
