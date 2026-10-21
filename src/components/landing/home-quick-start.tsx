"use client";
import { downloadQrA6Preview } from "@/lib/qr-preview-download";
import { landingDestination, type LandingInputMode } from "@/lib/landing-input";
import { FramePicker } from "@/components/qr/frame-picker";
import { FrameControls } from "@/components/qr/frame-controls";
import type { FrameConfig } from "@/lib/qr-frame";
import { HOME_QR_TYPE_EVENT } from "@/lib/home-qr-selection";
import { COMMERCIAL } from "@/lib/commercial-config";
import { TRIAL_DAYS } from "@/lib/trial-policy";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { QrContentForm } from "@/components/qr-forms";
import { HomeQrPreview } from "@/components/landing/home-qr-preview";
import { createQrContinuePath, writeQrCreateDraft } from "@/lib/qr-draft";
import { STATIC_QR_TYPES, prepareStaticQr, type StaticQrType } from "@/lib/static-qr";
import { writeStaticQrDraft } from "@/lib/static-qr-draft";
import { downloadStaticQr } from "@/lib/static-qr-download";
import { defaultQrStyle } from "@/lib/qr-style-config";
import { evaluateScannability } from "@/lib/scannability";
import { PRODUCT_GOALS, trackGoal, markOnboardingDownloaded } from "@/lib/product-analytics";
import { MSG } from "@/lib/user-messages";
import styles from "./home-generator.module.css";

type Props = { printA6?: boolean; heading?: string | false; source?: "home" | "landing"; inputMode?: LandingInputMode; urlLabel?: string; urlPlaceholder?: string; initialFrameText?: string;  trialUsed?: boolean; enabledTypes?: string[]; initialUrl?: string; dynamicRemaining?: number | null; initialType?: StaticQrType; signedIn: boolean; enabledStaticTypes: StaticQrType[] };
const labels: Record<StaticQrType, string> = { URL: "Ссылка", TEXT: "Текст", WIFI: "Wi-Fi", VCARD: "Визитка", EMAIL: "Email", PHONE: "Телефон", SMS: "SMS", LOCATION: "Координаты" };

export function HomeQuickStart({ initialType, initialUrl, dynamicRemaining, signedIn, enabledStaticTypes, enabledTypes, trialUsed, heading = "Генератор QR-кодов онлайн — бесплатно и без регистрации", source = "home", inputMode = "url", urlLabel = "Ссылка", urlPlaceholder = "https://example.com", initialFrameText = "Сканируйте код", printA6 = false }: Props) {
  const router = useRouter(), id = useId(), busy = useRef(false);
  const [message, setMessage] = useState("");
  const [moreTypes, setMoreTypes] = useState(false);
  const [type, setType] = useState<StaticQrType>(initialType ?? enabledStaticTypes[0] ?? "URL");
  const [payloads, setPayloads] = useState<Partial<Record<StaticQrType, Record<string, unknown>>>>(initialUrl ? { URL: { url: initialUrl } } : {});
  const [kind, setKind] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [foreground, setForeground] = useState(defaultQrStyle.dotColor);
  const [background, setBackground] = useState(defaultQrStyle.bgColor);
  const [frame, setFrame] = useState<FrameConfig>({ frameStyle: "tag", frameText: initialFrameText, frameColor: "#111111" });
  const [error, setError] = useState("");
  const [afterDownload, setAfterDownload] = useState(false);
  const generated = useRef("");
  const upgradeClicked = useRef(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<"png" | "svg" | "a6" | "archive" | "dynamic" | null>(null);
  const downloadArea = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    const node = downloadArea.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setSticky(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (source !== "home") return;
    function select(event: Event) {
      const next = (event as CustomEvent<string>).detail as StaticQrType;
      if (!enabledStaticTypes.includes(next)) return;
      setType(next); setKind("STATIC"); setError(""); setNotice("");
      document.getElementById("create-qr")?.querySelector<HTMLElement>("input, textarea, select")?.focus({ preventScroll: true });
    }
    window.addEventListener(HOME_QR_TYPE_EVENT, select);
    return () => window.removeEventListener(HOME_QR_TYPE_EVENT, select);
  }, [enabledStaticTypes, source]);
  const rawPayload = payloads[type] ?? {};
  const normalized = type === "URL" ? landingDestination(String(rawPayload.url ?? ""), inputMode, message) : null;
  const payload = type === "URL" ? { ...rawPayload, url: normalized ?? "" } : rawPayload;
  const prepared = prepareStaticQr(type, payload);
  const scan = evaluateScannability({ ...frame, foreground, background, margin: 4, logoScale: 0 });
  const dynamic = type === "URL" && kind === "DYNAMIC";
  const style = { ...defaultQrStyle, ...frame, dotColor: foreground, cornerSquareColor: foreground, cornerDotColor: foreground, bgColor: background, margin: 4, quietZoneModules: 4 };
  const canDownload = prepared.ok && scan.safeToUse && pending === null;
  const hasInput = Object.values(rawPayload).some(value => typeof value === "string" && value.trim());
  const inputHint = !prepared.ok && hasInput
    ? type === "URL" ? "Проверьте ссылку: она должна начинаться с https://" : prepared.error
    : type === "URL" ? "Вставьте ссылку — код появится сразу" : "Заполните поля — код появится сразу";
  function chooseKind(next: "STATIC" | "DYNAMIC") {
    if (next === "DYNAMIC" && (type !== "URL" || kind !== "DYNAMIC")) {
      trackGoal(PRODUCT_GOALS.dynamic_qr_created, {type:"URL",dynamic:true,where:source});
    }
    setType("URL"); setKind(next); setError(""); setNotice("");
  }
  const destination = (path: string) => signedIn ? path : `/register?next=${encodeURIComponent(path)}`;

  async function download(format: "png" | "svg" | "a6") {
    if (busy.current) return;
    if (!prepared.ok) { setError(prepared.error); return; }
    if (!scan.safeToUse) { setError(MSG.SCANNABILITY_TOO_LOW); return; }
    busy.current = true; setPending(format); setError(""); setNotice("");
    try {
      if (format === "a6") await downloadQrA6Preview(prepared.data, style);
      else await downloadStaticQr(prepared.data, foreground, background, format, frame);
      if (generated.current !== prepared.data) { trackGoal(PRODUCT_GOALS.qr_created, {type,dynamic:false,where:source}); generated.current=prepared.data; }
      markOnboardingDownloaded({ source, frame: frame.frameStyle !== "none", format: format === "a6" ? "svg" : format, contentType: type, kind: "STATIC" }, PRODUCT_GOALS.static_qr_downloaded);
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
    const url = landingDestination(String(rawPayload.url ?? ""), inputMode, message);
    if (!url) { setError(MSG.INVALID_PAYLOAD_URL); return; }
    trackGoal(PRODUCT_GOALS.qr_creation_started, { source, contentType: "URL", kind: "DYNAMIC" });
    const draft = { v: 1 as const, contentType: "URL" as const, url, kind: "DYNAMIC" as const };
    writeQrCreateDraft(draft); setPending("dynamic"); router.push(destination(createQrContinuePath(draft)));
  }

  if (!enabledStaticTypes.length) return <div className={styles.generatorUnavailable}><Button href={destination("/dashboard/create")}>Перейти к созданию</Button></div>;

  const primaryTypes = ["URL", "WIFI", "VCARD", "PDF", "MENU", "TEXT"];
  const available = (item: string) => enabledTypes ? enabledTypes.includes(item) : ["PDF", "MENU", "SOCIAL_LINKS"].includes(item) || enabledStaticTypes.includes(item as StaticQrType);
  function chooseType(item: string) {
    if (["PDF", "MENU", "SOCIAL_LINKS"].includes(item)) { router.push(destination(`/dashboard/create/${item.toLowerCase()}`)); return; }
    if (item === "URL_REVIEW") { chooseKind("DYNAMIC"); return; }
    setType(item as StaticQrType); setKind("STATIC"); setError(""); setNotice("");
  }
  const icons: Record<string,string> = {
    URL:"M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
    WIFI:"M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h.01",
    VCARD:"M4 4h16v16H4zM8 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0M7 16a3 3 0 0 1 6 0M16 8h1m-1 4h1m-1 4h1",
    PDF:"M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 13h8m-8 4h5",
    MENU:"M4 3v7a3 3 0 0 0 6 0V3M7 3v18M19 3c-3 3-4 7-4 10h4M19 3v18",
    TEXT:"M4 5h16M12 5v15M8 20h8",
  };
  return <>
    {heading !== false && <header className={styles.heading}>
      <h1 id="generator-title" tabIndex={-1}>{heading}</h1>
      <p><button type="button" onClick={() => chooseKind("DYNAMIC")}>Меняйте ссылку после печати — 2 кода бесплатно</button></p>
    </header>}
    <form className={`${styles.generator} ym-hide-content`} noValidate onSubmit={event => { event.preventDefault(); if (dynamic) continueDynamic(); else void download("png"); }}>
      <div className={styles.inputPanel}>
        <div className={styles.contentFields}>
          {type === "URL" ? <label htmlFor={`${id}-url`}>{type === initialType || !initialType ? urlLabel : "Ссылка"}<Input data-generator-url id={`${id}-url`} type={inputMode === "whatsapp" ? "tel" : "text"} inputMode={inputMode === "whatsapp" ? "tel" : "url"} autoComplete={inputMode === "whatsapp" ? "tel" : "url"} placeholder={urlPlaceholder} value={String(rawPayload.url ?? "")} aria-invalid={hasInput && !prepared.ok ? true : undefined} aria-describedby={`${id}-hint`} onChange={event => { setPayloads(current => ({...current,URL:{url:event.target.value}})); setError(""); setNotice(""); }} /></label>
            : <QrContentForm type={type} payload={payload} onChange={next => { setPayloads(current => ({...current,[type]:next})); setError(""); setNotice(""); }} workspaceId="" />}
          {type === "URL" && inputMode === "whatsapp" && <label htmlFor={`${id}-message`}>Первое сообщение (необязательно)<Input id={`${id}-message`} value={message} maxLength={500} onChange={event => setMessage(event.target.value)} placeholder="Здравствуйте! Хочу узнать подробнее." /></label>}
        </div>
        <nav className={styles.typeGrid} aria-label="Содержимое QR-кода">
          {primaryTypes.filter(available).map(item => <button type="button" key={item} aria-pressed={item === type} onClick={() => chooseType(item)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[item]} /></svg><span>{item === "PDF" ? "PDF" : item === "MENU" ? "Меню" : labels[item as StaticQrType]}</span></button>)}
        </nav>
        <button type="button" className={styles.moreButton} aria-expanded={moreTypes} aria-controls={`${id}-more`} onClick={() => setMoreTypes(!moreTypes)}>Ещё типы <span aria-hidden="true">{moreTypes ? "−" : "+"}</span></button>
        {moreTypes && <nav id={`${id}-more`} className={styles.moreTypes} aria-label="Другие типы QR">
          {enabledStaticTypes.includes("URL") && <button type="button" onClick={() => chooseType("URL_REVIEW")}>Ссылка на отзывы</button>}
          {available("SOCIAL_LINKS") && <button type="button" onClick={() => chooseType("SOCIAL_LINKS")}>Соцсети</button>}
          {STATIC_QR_TYPES.filter(item => !primaryTypes.includes(item) && enabledStaticTypes.includes(item)).map(item => <button type="button" key={item} aria-pressed={item === type} onClick={() => chooseType(item)}>{labels[item]}</button>)}
          <Link href={destination("/dashboard/create")}>Все типы</Link>
        </nav>}
        {type === "URL" && <fieldset className={styles.kindChoice}><legend className="sr-only">Тип QR-кода</legend>
          <label className={kind === "STATIC" ? styles.kindSelected : ""}><input type="radio" name={`${id}-kind`} checked={kind === "STATIC"} onChange={() => chooseKind("STATIC")} /><span><strong>Статический</strong><span>Бесплатно</span><small>Не меняется после печати</small></span></label>
          <label className={dynamic ? styles.kindSelected : ""}><input type="radio" name={`${id}-kind`} checked={dynamic} onChange={() => chooseKind("DYNAMIC")} /><span><strong>Динамический</strong><span>{dynamicRemaining === 0 ? trialUsed ? "На тарифе Про" : `${TRIAL_DAYS} дней Про бесплатно` : `${dynamicRemaining ?? COMMERCIAL.free.dynamic} бесплатно`}</span><small>Меняйте ссылку после печати</small></span></label>
        </fieldset>}
      </div>
      <div className={styles.outputPanel}>
        <div className={styles.preview} aria-label={prepared.ok && !dynamic ? "Ваш QR-код" : "Пример QR-кода"}>
          {(!prepared.ok || dynamic) && <span className={styles.example}>Пример</span>}
          <HomeQrPreview className={styles.qrImage} value={prepared.ok && !dynamic ? prepared.data : "https://qr-s.ru"} foreground={foreground} background={background} frame={frame} />
        </div>
        <div className={styles.frameOptions}><span className={styles.frameLabel}>Оформление</span><FramePicker value={frame} onChange={patch=>setFrame(current=>({...current,...patch}))}/></div>
        <div ref={downloadArea} className={styles.downloadArea}>
          {dynamic ? <><Button type="submit" block disabled={pending !== null || !prepared.ok}>Продолжить в кабинете</Button><p id={`${id}-hint`} className={styles.hint}>Постоянная короткая ссылка появится после сохранения в кабинете.</p></>
          : <><Button type="submit" block disabled={!canDownload} aria-busy={pending === "png"}>{pending === "png" ? "Подготовка…" : "Скачать PNG"}</Button><p id={`${id}-hint`} className={styles.hint}>{!prepared.ok ? inputHint : ""}</p></>}
        </div>
        {!dynamic && <div className={styles.secondaryActions}>
          <Button variant="text" type="button" disabled={!canDownload} onClick={() => void download("svg")} aria-busy={pending === "svg"}>{pending === "svg" ? "Подготовка…" : "SVG"}</Button><span aria-hidden="true">·</span>
          <Button variant="text" type="button" disabled={pending !== null || !prepared.ok} onClick={archive} title={`Бесплатно, до ${COMMERCIAL.free.archive} кодов в архиве. Черновик хранится в этой вкладке один час; данные попадут на сервер только после сохранения.`}>Сохранить в кабинете</Button>
        </div>}
        {printA6 && !dynamic && <Button type="button" variant="secondary" disabled={!canDownload} onClick={() => void download("a6")} aria-busy={pending === "a6"}>Скачать табличку A6 · SVG</Button>}
        {error && <p className={styles.formError} role="alert">{error}</p>}
        {!error && prepared.ok && !scan.safeToUse && <p className={styles.formError} role="alert">{MSG.SCANNABILITY_TOO_LOW}</p>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {afterDownload && type === "URL" && <aside className={styles.afterDownload} aria-label="Менять ссылку после печати">
          <strong>Код скачан. Он пойдёт в печать?</strong><p>Если ссылка поменяется, статический код придётся перепечатать. У динамического кода ссылку вы поменяете в кабинете.</p>
          <Button type="button" onClick={() => { if (!upgradeClicked.current) { trackGoal(PRODUCT_GOALS.upgrade_prompt_click, {place:"after_download",plan:"pro"}); upgradeClicked.current = true; } continueDynamic(); }}>{dynamicRemaining === 0 && trialUsed ? "Перейти на Про и создать динамический код" : `Сделать этот код динамическим — ${dynamicRemaining === 0 ? `${TRIAL_DAYS} дней Про бесплатно` : "бесплатно"}`}</Button>
          <Button type="button" variant="ghost" onClick={() => setAfterDownload(false)}>Нет, мне хватит обычного</Button><p>{COMMERCIAL.free.dynamic} динамических кода бесплатно. Напечатанные коды продолжают открываться и после окончания тарифа.</p>
        </aside>}
      </div>
      {!dynamic && <details className={styles.design}><summary>Цвета и рамка</summary><div className={styles.colorFields}>
        <label htmlFor={`${id}-fg`}>Цвет кода<Input id={`${id}-fg`} type="color" value={foreground} onChange={event => setForeground(event.target.value)} /></label>
        <label htmlFor={`${id}-bg`}>Фон<Input id={`${id}-bg`} type="color" value={background} onChange={event => setBackground(event.target.value)} /></label>
      </div><FrameControls showTemplates={false} value={frame} onChange={patch => setFrame(current => ({...current,...patch}))} captions={["Сканируйте код","Наведите камеру","Оставьте отзыв","Меню","Wi-Fi для гостей"]} /></details>}
    </form>
    <p className={styles.footnote}>Без регистрации · PNG и SVG · {COMMERCIAL.free.dynamic} динамических кода бесплатно</p>
    {sticky && canDownload && !dynamic && <div className={styles.stickyDownload}><Button type="button" block onClick={() => void download("png")}>Скачать PNG</Button></div>}
  </>;
}
