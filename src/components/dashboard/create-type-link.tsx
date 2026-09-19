"use client";

import Link from "next/link";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import styles from "./create-flow.module.css";

type Props = { type: string; label: string; description: string; icon: string; locked?: boolean; lockHint?: string; featured?: boolean };

export function CreateTypeLink({ type, label, description, icon, locked, lockHint, featured }: Props) {
  return <Link href={locked ? "/dashboard/billing" : `/dashboard/create/${type.toLowerCase()}`}
    className={`${styles.typeLink} ${featured ? styles.featured : ""}`}
    onClick={() => trackGoal(PRODUCT_GOALS.qr_type_selected, { type, ...(locked ? { locked: true } : {}) })}>
    <svg className={styles.typeIcon} width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
    <span className={styles.typeCopy}><strong>{featured ? "QR-код для ссылки" : label}</strong><span>{description}</span>
      {lockHint && <span className={styles.lockHint}>{lockHint} · Смотреть тарифы</span>}
    </span>
    <svg className={styles.arrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
  </Link>;
}
