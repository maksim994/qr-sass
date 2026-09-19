"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { ANALYTICS_TIMEZONE } from "@/lib/analytics-metrics";
import styles from "./analytics-dashboard.module.css";

type Row = { key: string; count: number };
export function AnalyticsChart({ rows, metricLabel = "Открытия" }: { rows: Row[]; metricLabel?: string }) {
  const [active, setActive] = useState<number | null>(null);
  if (rows.length === 0) return null;
  const width = 800, height = 220, left = 0, right = 0, top = 18, bottom = 24;
  const maximum = Math.max(2, ...rows.map(row => row.count));
  const ceiling = Math.ceil(maximum / 2) * 2;
  const x = (i: number) => left + i / Math.max(rows.length - 1, 1) * (width - left - right);
  const y = (count: number) => height - bottom - count / ceiling * (height - top - bottom);
  const points = rows.map((row, i) => `${x(i)},${y(row.count)}`).join(" ");
  const selected = active === null ? null : rows[active];
  const dateLabel = (key: string) => new Date(`${key}T12:00:00+03:00`).toLocaleDateString("ru-RU", { day:"numeric",month:"short", timeZone:ANALYTICS_TIMEZONE });
  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width * width;
    setActive(Math.max(0, Math.min(rows.length - 1, Math.round((position - left) / (width - left - right) * (rows.length - 1)))));
  }
  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
    event.preventDefault();
    setActive(event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, (active ?? rows.length - 1) + (event.key === "ArrowLeft" ? -1 : 1))));
  }
  const ticks = [...new Set([0, Math.floor((rows.length - 1) / 4), Math.floor((rows.length - 1) / 2), Math.floor((rows.length - 1) * .75), rows.length - 1])];
  return <div className={styles.chart}>
    <p className={styles.chartReadout} aria-live="polite">{selected ? <><strong>{dateLabel(selected.key)}</strong><span>{metricLabel}: {selected.count.toLocaleString("ru-RU")}</span></> : "Наведите на график или выберите день стрелками клавиатуры"}</p>
    <div className={styles.plotWrap}><div className={styles.yAxis} aria-hidden="true">{[ceiling, ceiling / 2, 0].map(value => <span key={value}>{value.toLocaleString("ru-RU")}</span>)}</div>
    <svg className={styles.plot} preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${metricLabel} по дням. Стрелки влево и вправо выбирают день, Home и End — первый и последний.`} tabIndex={0} onFocus={() => setActive(rows.length - 1)} onKeyDown={onKeyDown} onPointerMove={onPointerMove} onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)}>
      {[0, ceiling / 2, ceiling].map(value => <g key={value} aria-hidden="true"><line x1={left} y1={y(value)} x2={width - right} y2={y(value)} className={styles.gridLine} /></g>)}
      <polyline points={points} className={styles.line} aria-hidden="true" />
      {active !== null && selected && <g aria-hidden="true"><line x1={x(active)} x2={x(active)} y1={top} y2={height - bottom} className={styles.cursorLine} /><circle cx={x(active)} cy={y(selected.count)} r="5" className={styles.point} /></g>}
    </svg></div>
    <div className={styles.axis} aria-hidden="true">{ticks.map(i => <span key={i} style={{ left: `${i / Math.max(rows.length - 1, 1) * 100}%` }}>{dateLabel(rows[i].key)}</span>)}</div>
    <details className={styles.chartData}><summary>Данные по дням</summary><div className={styles.dailyTableWrap}><table><caption className="sr-only">{metricLabel} по дням без известных ботов</caption><thead><tr><th scope="col">Дата · МСК</th><th scope="col">{metricLabel}</th></tr></thead><tbody>{rows.map(row => <tr key={row.key}><th scope="row">{dateLabel(row.key)}</th><td>{row.count.toLocaleString("ru-RU")}</td></tr>)}</tbody></table></div></details>
  </div>;
}
