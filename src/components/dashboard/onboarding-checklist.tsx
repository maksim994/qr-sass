"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  dismissOnboarding,
  hasOnboardingDownloaded,
  isOnboardingDismissed,
} from "@/lib/product-analytics";

type Props = {
  hasQr: boolean;
  hasScan: boolean;
  hasDynamic: boolean;
  hasTeam: boolean;
};

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
};

export function OnboardingChecklist({ hasQr, hasScan, hasDynamic, hasTeam }: Props) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setDismissed(isOnboardingDismissed());
    setDownloaded(hasOnboardingDownloaded());
    setReady(true);
  }, []);

  if (!ready || dismissed) return null;

  // Scan implies the code was already used/shared — count download done.
  const downloadDone = downloaded || hasScan;

  const steps: Step[] = [
    {
      id: "create",
      title: "Создайте первый QR-код",
      description: "Выберите тип и сохраните код в библиотеке.",
      href: "/dashboard/create",
      cta: "Создать",
      done: hasQr,
    },
    {
      id: "download",
      title: "Скачайте QR",
      description: "PNG или SVG — для печати, меню или рекламы.",
      href: hasQr ? "/dashboard/library" : "/dashboard/create",
      cta: "К библиотеке",
      done: downloadDone,
    },
    {
      id: "scan",
      title: "Получите первое сканирование",
      description: "Отсканируйте динамический код телефоном или откройте короткую ссылку.",
      href: hasQr ? "/dashboard/analytics" : "/dashboard/create",
      cta: "Аналитика",
      done: hasScan,
    },
    {
      id: "value",
      title: "Попробуйте динамику или команду",
      description: "Смените ссылку без перепечатки или пригласите коллегу.",
      href: hasDynamic || hasTeam ? "/dashboard/team" : "/dashboard/billing",
      cta: hasDynamic || hasTeam ? "Команда" : "Тарифы",
      done: hasDynamic || hasTeam,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <section className="qrs-onboarding" aria-label="Первые шаги">
      <div className="qrs-onboarding__head">
        <div className="qrs-onboarding__intro">
          <div className="qrs-onboarding__eyebrow">
            {doneCount} из {steps.length} шагов выполнено
          </div>
          <h2 className="qrs-onboarding__title">Начните с главного</h2>
          <p className="qrs-onboarding__lead">
            Создайте QR, скачайте его и убедитесь, что сканирования появляются в аналитике.
          </p>
        </div>
        <button
          type="button"
          className="qrs-onboarding__dismiss"
          onClick={() => {
            dismissOnboarding();
            setDismissed(true);
          }}
        >
          Скрыть
        </button>
      </div>

      <div className="qrs-onboarding__list" role="list">
        {steps.map((step, index) => (
          <div
            key={step.id}
            role="listitem"
            className={`qrs-onboarding__item${step.done ? " is-done" : ""}`}
          >
            <span className="qrs-onboarding__index" aria-hidden="true">
              {step.done ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <div className="qrs-onboarding__body">
              <div className="qrs-onboarding__item-title">{step.title}</div>
              <div className="qrs-onboarding__item-desc">{step.description}</div>
            </div>
            <div className="qrs-onboarding__action">
              {step.done ? (
                <span className="qrs-onboarding__done-label">Готово</span>
              ) : (
                <Link href={step.href} className="fk-button fk-button--secondary fk-button--sm">
                  {step.cta}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
