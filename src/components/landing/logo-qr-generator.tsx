"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "@/components/ui";
import { prepareStaticQr } from "@/lib/static-qr";
import { publicLogoQrStyle } from "@/lib/public-logo-qr";
import { buildQrStylingOptions } from "@/lib/qr-styling-options";
import { downloadQrPreview } from "@/lib/qr-preview-download";
import { evaluateScannability } from "@/lib/scannability";
import { PRODUCT_GOALS, trackGoal, markOnboardingDownloaded } from "@/lib/product-analytics";
import { MSG } from "@/lib/user-messages";
import s from "./logo-qr-generator.module.css";

export function LogoQrGenerator({ enabled }: { enabled: boolean }) {
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [filename, setFilename] = useState("");
  const [foreground, setForeground] = useState("#111111");
  const [background, setBackground] = useState("#ffffff");
  const [loading, setLoading] = useState(false);
  const [rendered, setRendered] = useState("");
  const [pending, setPending] = useState<"png" | "svg" | null>(null);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [renderError, setRenderError] = useState("");
  const [notice, setNotice] = useState("");
  const mount = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const uploadJob = useRef(0);
  const cancelUpload = useCallback(() => { uploadJob.current++; }, []);
  const busy = useRef(false);
  const created = useRef("");
  const prepared = prepareStaticQr("URL", { url });
  const data = prepared.ok ? prepared.data : "https://qr-s.ru";
  const style = useMemo(() => publicLogoQrStyle(logo, foreground, background), [logo, foreground, background]);
  const scan = evaluateScannability(style);
  const renderKey = JSON.stringify([data, logo, foreground, background]);
  const canDownload = enabled && prepared.ok && scan.safeToUse && !loading && pending === null && rendered === renderKey && !renderError;

  useEffect(() => {
    let current = true;
    const node = mount.current;
    if (!node || !enabled) return;
    const draw = async () => {
      try {
        const { default: QRCodeStyling } = await import("qr-code-styling");
        const qr = new QRCodeStyling(buildQrStylingOptions(data, style, 320));
        const raw = await qr.getRawData("svg");
        if (!raw) throw new Error("empty-render");
        if (!current) return;
        node.replaceChildren();
        qr.append(node);
        setRendered(renderKey);
        setRenderError("");
      } catch {
        if (current) { node.replaceChildren(); setRendered(""); setRenderError(MSG.LOGO_QR_RENDER); }
      }
    };
    const timer = setTimeout(() => { void draw(); }, 120);
    return () => { current = false; clearTimeout(timer); node.replaceChildren(); };
  }, [data, style, renderKey, enabled]);
  useEffect(() => cancelUpload, [cancelUpload]);

  async function upload(file: File) {
    const job = ++uploadJob.current;
    setNotice(""); setError(""); setUploadError(""); setLoading(false);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setUploadError(MSG.LOGO_QR_TYPE); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError(MSG.LOGO_QR_SIZE); return; }
    setLoading(true);
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = objectUrl; await image.decode();
      if (uploadJob.current !== job) return;
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 20_000_000) { setUploadError(MSG.LOGO_QR_SIZE); return; }
      const edge = Math.min(512, Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = edge;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas-unavailable");
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, edge, edge);
      const ratio = edge * 0.84 / Math.max(image.naturalWidth, image.naturalHeight);
      const width = image.naturalWidth * ratio, height = image.naturalHeight * ratio;
      context.drawImage(image, (edge - width) / 2, (edge - height) / 2, width, height);
      setLogo(canvas.toDataURL("image/png")); setFilename(file.name);
    } catch { if (uploadJob.current === job) setUploadError(MSG.LOGO_QR_FAILED); }
    finally { URL.revokeObjectURL(objectUrl); if (uploadJob.current === job) setLoading(false); }
  }

  async function download(format: "png" | "svg") {
    if (busy.current || !canDownload || !prepared.ok) return;
    busy.current = true; setPending(format); setError(""); setNotice("");
    try {
      await downloadQrPreview(prepared.data, style, format);
      if (created.current !== prepared.data) { trackGoal(PRODUCT_GOALS.qr_created, { type: "URL", dynamic: false, where: "landing" }); created.current = prepared.data; }
      markOnboardingDownloaded({ type: "URL", dynamic: false, where: "landing", format }, PRODUCT_GOALS.static_qr_downloaded);
      setNotice("Код скачан. Проверьте его камерой и на пробной печати.");
    } catch { setError(MSG.COULD_NOT_DOWNLOAD); }
    finally { busy.current = false; setPending(null); }
  }

  if (!enabled) return <p role="status">Создание этого типа QR сейчас недоступно. <Link href="/#create-qr">Выбрать другой тип</Link>.</p>;
  return <form className={`${s.generator} ym-hide-content`} id="create-qr" noValidate onSubmit={event => { event.preventDefault(); void download("png"); }} aria-label="Генератор QR-кода с логотипом">
    <div className={s.inputs}>
      <label className={s.field} htmlFor="logo-qr-url">Ссылка<Input id="logo-qr-url" inputMode="url" autoComplete="url" value={url} disabled={pending !== null} placeholder="https://example.com" aria-invalid={url.trim() && !prepared.ok ? true : undefined} aria-describedby="logo-qr-url-hint" onChange={event => { setUrl(event.target.value); setNotice(""); setError(""); }}/></label>
      <p id="logo-qr-url-hint" className={s.hint}>{url.trim() && !prepared.ok ? prepared.error : "Адрес сайта, меню, каталога или формы"}</p>
      <div className={s.logoField}><span className={s.label}>Логотип в центре</span><div className={s.uploadRow}>
        {/* Browser-normalized local data URL, never a remote image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && <img src={logo} alt="Выбранный логотип" width={56} height={56} className={`${s.thumbnail} ym-hide-content`}/>}
        <div><Button type="button" variant="secondary" disabled={pending !== null} aria-describedby={uploadError ? "logo-qr-upload-error" : "logo-qr-file-hint"} onClick={() => input.current?.click()}>{loading ? "Выбрать другой файл" : logo ? "Заменить логотип" : "Загрузить логотип"}</Button><p id="logo-qr-file-hint" className={`${s.fileName} ym-hide-content`}>{filename || "PNG, JPEG или WebP · до 5 МБ"}</p></div>
        {logo && <Button type="button" variant="text" disabled={pending !== null} onClick={() => { cancelUpload(); setLoading(false); setLogo(""); setFilename(""); setError(""); setUploadError(""); setNotice(""); }}>Удалить</Button>}
      </div><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className={s.fileInput} disabled={pending !== null} aria-label="Выбрать файл логотипа" aria-invalid={uploadError ? true : undefined} aria-describedby={uploadError ? "logo-qr-upload-error" : "logo-qr-file-hint"} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }}/>
      {uploadError && <p id="logo-qr-upload-error" className={s.error} role="alert">{uploadError}</p>}</div>
      <div className={s.safety}><strong>Коррекция H включена автоматически</strong><p>Логотип занимает небольшую область в центре. Это снижает риск, но не гарантирует чтение: проверьте QR на телефонах и пробной печати.</p></div>
      <details className={s.colors}><summary>Цвета кода</summary><div><label htmlFor="logo-qr-color">Цвет QR<Input id="logo-qr-color" type="color" value={foreground} disabled={pending !== null} onChange={event => setForeground(event.target.value)}/></label><label htmlFor="logo-qr-background">Фон<Input id="logo-qr-background" type="color" value={background} disabled={pending !== null} onChange={event => setBackground(event.target.value)}/></label></div></details>
      <p className={s.private}>Логотип и ссылка обрабатываются в браузере. Файл не отправляется на сервер.</p>
    </div>
    <div className={s.output}>
      <div className={`${s.preview} ym-hide-content`} aria-label={prepared.ok ? logo ? "Ваш QR-код с логотипом" : "Ваш QR-код" : "Пример QR-кода"} aria-busy={!renderError && (rendered !== renderKey || loading)}>
        {!prepared.ok && <span className={s.example}>Пример</span>}<div ref={mount} className={s.qr}/>
        {(rendered !== renderKey || loading) && !renderError && <span role="status" className={s.loading}>{loading ? "Обрабатываем логотип…" : "Строим QR-код…"}</span>}
      </div>
      <Button type="submit" block disabled={!canDownload} aria-busy={pending === "png"}>{pending === "png" ? "Подготовка…" : "Скачать PNG"}</Button>
      <Button type="button" variant="secondary" block disabled={!canDownload} onClick={() => void download("svg")} aria-busy={pending === "svg"}>{pending === "svg" ? "Подготовка…" : "Скачать SVG"}</Button>
      <p className={s.hint}>Бесплатно · без регистрации</p>
      {(error || renderError || !scan.safeToUse) && <p className={s.error} role="alert">{error || renderError || MSG.SCANNABILITY_TOO_LOW}</p>}
      {notice && <p className={s.notice} role="status">{notice} <Link href="/skaner-qr-koda">Открыть сканер →</Link></p>}
    </div>
  </form>;
}
