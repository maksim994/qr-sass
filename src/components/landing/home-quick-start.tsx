"use client";
import { FrameControls } from "@/components/qr/frame-controls";
import type { FrameConfig } from "@/lib/qr-frame";
import { COMMERCIAL, rubles } from "@/lib/commercial-config";
import { TRIAL_DAYS } from "@/lib/trial-policy";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { QrContentForm } from "@/components/qr-forms";
import { HomeQrPreview } from "@/components/landing/home-qr-preview";
import { createQrContinuePath, normalizeDraftUrl, writeQrCreateDraft } from "@/lib/qr-draft";
import { STATIC_QR_TYPES, prepareStaticQr, type StaticQrType } from "@/lib/static-qr";
import { writeStaticQrDraft } from "@/lib/static-qr-draft";
import { downloadStaticQr } from "@/lib/static-qr-download";
import { defaultQrStyle } from "@/lib/qr-style-config";
import { evaluateScannability } from "@/lib/scannability";
import { PRODUCT_GOALS, trackGoal, markOnboardingDownloaded } from "@/lib/product-analytics";
import { MSG } from "@/lib/user-messages";
import styles from "@/app/home.module.css";

type Props = { initialUrl?: string; dynamicRemaining?: number | null; initialType?: StaticQrType; signedIn: boolean; enabledStaticTypes: StaticQrType[] };
const labels: Record<StaticQrType, string> = { URL: "Ссылка", TEXT: "Текст", WIFI: "Wi-Fi", VCARD: "Контакты", EMAIL: "Email", PHONE: "Телефон", SMS: "SMS", LOCATION: "Координаты" };

export function HomeQuickStart({ initialType, initialUrl, dynamicRemaining, signedIn, enabledStaticTypes }: Props) {
  const router = useRouter(), id = useId(), busy = useRef(false);
  const [type, setType] = useState<StaticQrType>(initialType ?? enabledStaticTypes[0] ?? "URL");
  const [payloads, setPayloads] = useState<Partial<Record<StaticQrType, Record<string, unknown>>>>(initialUrl ? { URL: { url: initialUrl } } : {});
  const [kind, setKind] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [foreground, setForeground] = useState(defaultQrStyle.dotColor);
  const [background, setBackground] = useState(defaultQrStyle.bgColor);
  const [frame, setFrame] = useState<FrameConfig>({ frameStyle: "none", frameText: "Сканируй меня", frameColor: "#111111" });
  const [error, setError] = useState("");
  const [afterDownload, setAfterDownload] = useState(false);
  const upgradeClicked = useRef(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<"png" | "svg" | "archive" | "dynamic" | null>(null);
  const payload = payloads[type] ?? {};
  const prepared = prepareStaticQr(type, payload);
  const scan = evaluateScannability({ ...frame, foreground, background, margin: 4, logoScale: 0 });
  const dynamic = type === "URL" && kind === "DYNAMIC";
  const style = { ...defaultQrStyle, ...frame, dotColor: foreground, cornerSquareColor: foreground, cornerDotColor: foreground, bgColor: background, margin: 4, quietZoneModules: 4 };
  const destination = (path: string) => signedIn ? path : `/register?next=${encodeURIComponent(path)}`;

  async function download(format: "png" | "svg") {
    if (busy.current) return;
    if (!prepared.ok) { setError(prepared.error); return; }
    if (!scan.safeToUse) { setError(MSG.SCANNABILITY_TOO_LOW); return; }
    busy.current = true; setPending(format); setError(""); setNotice("");
    try {
      await downloadStaticQr(prepared.data, foreground, background, format, frame);
      markOnboardingDownloaded({ source: "home", format, contentType: type, kind: "STATIC" }, PRODUCT_GOALS.static_qr_downloaded);
      try { if (!sessionStorage.getItem("qrs_after_download_seen")) { sessionStorage.setItem("qrs_after_download_seen", "1"); setAfterDownload(true); } } catch { setAfterDownload(true); }
      setNotice("Код скачан. Проверьте QR камерой перед печатью.");
    } catch { setError(MSG.COULD_NOT_DOWNLOAD); }
    finally { busy.current = false; setPending(null); }
  }

  function archive() {
    if (!prepared.ok) { setError(prepared.error); return; }
    if (!scan.safeToUse) { setError(MSG.SCANNABILITY_TOO_LOW); return; }
    if (!writeStaticQrDraft({ v: 1, createdAt: Date.now(), contentType: type, payload: prepared.payload, style })) {
      setError(MSG.QR_DRAFT_STORAGE_UNAVAILABLE); return;
    }
    setPending("archive"); router.push(destination("/dashboard/create"));
  }

  function continueDynamic(event?: React.FormEvent) {
    event?.preventDefault();
    const url = normalizeDraftUrl(String(payload.url ?? ""));
    if (!url) { setError(MSG.INVALID_PAYLOAD_URL); return; }
    trackGoal(PRODUCT_GOALS.qr_creation_started, { source: "home", contentType: "URL", kind: "DYNAMIC" });
    const draft = { v: 1 as const, contentType: "URL" as const, url, kind: "DYNAMIC" as const };
    writeQrCreateDraft(draft); setPending("dynamic"); router.push(destination(createQrContinuePath(draft)));
  }

  if (!enabledStaticTypes.length) return <div className={styles.generatorUnavailable}><Button href={destination("/dashboard/create")}>Перейти к созданию</Button></div>;

  return <div className={styles.generator} id="create-qr">
    <nav className={styles.typeNav} aria-label="Содержимое статического QR">
      {STATIC_QR_TYPES.filter(item => enabledStaticTypes.includes(item)).map(item => <button type="button" key={item} aria-pressed={type === item} className={type === item ? styles.selectedType : undefined} onClick={() => { setType(item); setKind("STATIC"); setError(""); setNotice(""); }}>{labels[item]}</button>)}
      <Link href={destination("/dashboard/create")} className={styles.allTypes}>Ещё типы</Link>
    </nav>
    <div className={styles.generatorBody}>
      <form onSubmit={dynamic ? continueDynamic : event => { event.preventDefault(); void download("png"); }} className={styles.generatorForm}>
        <QrContentForm type={type} payload={payload} onChange={next => { setPayloads(current => ({ ...current, [type]: next })); setError(""); setNotice(""); }} workspaceId="" />
        {type === "URL" && <fieldset className={styles.kindChoice}><legend className="sr-only">Тип QR-кода</legend>
          <label><input type="radio" name={`${id}-kind`} checked={kind === "STATIC"} onChange={() => setKind("STATIC")} />Статический <span>Бесплатно</span></label>
          <label><input type="radio" name={`${id}-kind`} checked={kind === "DYNAMIC"} onChange={() => setKind("DYNAMIC")} />Динамический <span>2 бесплатно</span></label>
        </fieldset>}
        <p className={styles.kindHint}>{dynamic ? `Меняйте ссылку после печати. Динамический код создаётся в кабинете; пробный период — ${TRIAL_DAYS} дней.` : "Не меняется после печати. Сканы не считаются."}</p>
        {!dynamic && <details className={styles.staticDesign}><summary>Цвета и рамка QR-кода</summary><div>
          <label htmlFor={`${id}-fg`}>Цвет кода<Input id={`${id}-fg`} type="color" value={foreground} onChange={event => setForeground(event.target.value)} /></label>
          <label htmlFor={`${id}-bg`}>Фон<Input id={`${id}-bg`} type="color" value={background} onChange={event => setBackground(event.target.value)} /></label>
        </div><FrameControls value={frame} onChange={patch => setFrame(current => ({ ...current, ...patch }))} /><p>Оставлено свободное поле в четыре модуля. Проверьте контраст и сканирование на материале печати.</p></details>}
      <div className={styles.generatorPreview}>
        <div className={styles.previewTop}><span>Ваш QR-код</span><span>{prepared.ok && !dynamic ? "Готов к скачиванию" : "Пример"}</span></div>
        <HomeQrPreview value={prepared.ok && !dynamic ? prepared.data : "https://qr-s.ru"} foreground={foreground} background={background} frame={frame} />
        <p>{dynamic ? "Постоянная короткая ссылка появится после сохранения в кабинете." : prepared.ok ? "PNG — 1200 × 1200. SVG масштабируется без потери чёткости." : "Заполните содержимое — появится ваш код."}</p>
      </div>
        <div className={styles.generatorAction}>
          {dynamic ? <Button type="submit" disabled={pending !== null}>Продолжить в кабинете →</Button> : <>
            <Button type="submit" disabled={pending !== null || !prepared.ok || !scan.safeToUse} aria-busy={pending === "png"}>{pending === "png" ? "Подготовка…" : "Скачать PNG"}</Button>
            <Button type="button" variant="secondary" disabled={pending !== null || !prepared.ok || !scan.safeToUse} onClick={() => void download("svg")} aria-busy={pending === "svg"}>{pending === "svg" ? "Подготовка…" : "SVG"}</Button>
          </>}
        </div>
        {!dynamic && <div className={styles.staticArchive}><Button type="button" variant="ghost" disabled={pending !== null || !prepared.ok} onClick={archive}>Сохранить код, чтобы не потерять</Button><p>Бесплатно, до 10 кодов в архиве. Черновик хранится в этой вкладке один час; данные попадут на сервер только после сохранения.</p></div>}
        {error && <p className={styles.formError} role="alert">{error}</p>}
        {!error && prepared.ok && !scan.safeToUse && <p className={styles.formError} role="alert">{MSG.SCANNABILITY_TOO_LOW}</p>}
        {afterDownload && type === "URL" && <aside className={styles.afterDownload} aria-label="Менять ссылку после печати">
          <strong>Код скачан. Он пойдёт в печать?</strong><p>Если ссылка поменяется, статический код придётся перепечатать. У динамического кода ссылку вы поменяете в кабинете.</p>
          <Button type="button" onClick={() => { if (!upgradeClicked.current) { trackGoal(PRODUCT_GOALS.upgrade_prompt_click, {place:"after_download",plan:"pro"}); upgradeClicked.current = true; } continueDynamic(); }}>Сделать этот код динамическим — {dynamicRemaining === 0 ? "7 дней Про бесплатно" : "бесплатно"}</Button>
          <Button variant="ghost" onClick={()=>setAfterDownload(false)}>Нет, мне хватит обычного</Button><p>{COMMERCIAL.free.dynamic} динамических кода бесплатно. Напечатанные коды продолжают открываться и после окончания тарифа.</p>
        </aside>}
        <p className={styles.inputHint}>Без регистрации · PNG и SVG · Динамические коды от {rubles(COMMERCIAL.pro.priceRub)} в месяц</p>
        <p className={styles.inputHint} role="status">{notice || (!prepared.ok && Object.keys(payload).length ? prepared.error : "")}</p>
      </form>

    </div>
  </div>;
}
