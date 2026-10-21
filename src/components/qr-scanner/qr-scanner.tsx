"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { decodeQrSource } from "@/lib/qr-scan-decode";
import { parseScanResult, type ScanResult } from "@/lib/qr-scan-result";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import { MSG } from "@/lib/user-messages";
import s from "./qr-scanner.module.css";

const labels = { URL: "Ссылка", TEXT: "Текст", WIFI: "Wi-Fi", VCARD: "Контакт" };
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"]);

function CameraIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 5 9.5 3h5L16 5h3a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/></svg>;
}

export function QrScanner() {
  const [tab, setTab] = useState<"camera" | "photo">("camera");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState("");
  const [fileName, setFileName] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const accepted = useRef(false);

  const stopResources = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const invalidate = useCallback(() => {
    generation.current++;
    stopResources();
  }, [stopResources]);
  const cancel = useCallback(() => {
    invalidate();
    setActive(false);
    setBusy(false);
  }, [invalidate]);

  const accept = useCallback((raw: string) => {
    if (accepted.current) return;
    accepted.current = true;
    cancel();
    const next = parseScanResult(raw);
    setResult(next);
    setError("");
    trackGoal(PRODUCT_GOALS.scan_success, { type: next.type, where: "landing" });
  }, [cancel]);

  useEffect(() => {
    const pause = () => { if (document.hidden) cancel(); };
    document.addEventListener("visibilitychange", pause);
    window.addEventListener("pagehide", cancel);
    return () => {
      invalidate();
      document.removeEventListener("visibilitychange", pause);
      window.removeEventListener("pagehide", cancel);
    };
  }, [cancel, invalidate]);
  useEffect(() => { if (result) resultRef.current?.focus(); }, [result]);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(""), 2500); return () => clearTimeout(timer); }, [copied]);

  const readFile = useCallback(async (file: File) => {
    cancel();
    accepted.current = false;
    setResult(null);
    setTab("photo");
    setFileName(file.name);
    setCopied("");
    if (!IMAGE_TYPES.has(file.type)) { setError(MSG.SCAN_FILE_TYPE); return; }
    if (file.size > 20 * 1024 * 1024) { setError(MSG.SCAN_FILE_SIZE); return; }
    const job = generation.current;
    const current = () => generation.current === job;
    setError("");
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!current()) return;
      if (image.naturalWidth * image.naturalHeight > 40_000_000) { setError(MSG.SCAN_IMAGE_SIZE); return; }
      const raw = await decodeQrSource(image, image.naturalWidth, image.naturalHeight, true, current);
      if (!current()) return;
      if (raw !== null) accept(raw);
      else setError(MSG.SCAN_NOT_FOUND);
    } catch {
      if (current()) setError(MSG.SCAN_IMAGE_FAILED);
    } finally {
      URL.revokeObjectURL(url);
      if (current()) setBusy(false);
    }
  }, [accept, cancel]);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.items ?? []).find(item => item.type.startsWith("image/"))?.getAsFile();
      if (file) { event.preventDefault(); void readFile(file); }
    };
    document.addEventListener("paste", paste);
    return () => document.removeEventListener("paste", paste);
  }, [readFile]);

  const startCamera = async (deviceId = "") => {
    cancel();
    setError("");
    setCopied("");
    accepted.current = false;
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { setError(MSG.SCAN_CAMERA_UNAVAILABLE); return; }
    const job = generation.current;
    const current = () => generation.current === job;
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } } : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (!current()) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { cancel(); return; }
      video.srcObject = stream;
      setActive(true);
      await video.play();
      if (!current()) return;
      setActive(true);
      setBusy(false);
      setDevice(stream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId);
      // Camera labels become available after permission. A failed inventory must not stop the stream.
      void navigator.mediaDevices.enumerateDevices().then(list => { if (current()) setCameras(list.filter(item => item.kind === "videoinput")); }).catch(() => {});
      stream.getVideoTracks().forEach(track => { track.onended = () => { if (current()) { cancel(); setError(MSG.SCAN_CAMERA_MISSING); } }; });
      const scan = async () => {
        if (!current()) return;
        try {
          const raw = await decodeQrSource(video, video.videoWidth, video.videoHeight, false, current);
          if (!current()) return;
          if (raw !== null) { accept(raw); return; }
        } catch { /* A transient camera frame can be unavailable during autofocus. */ }
        if (current()) timerRef.current = setTimeout(scan, 220);
      };
      void scan();
    } catch (cause) {
      if (!current()) return;
      cancel();
      const name = cause instanceof Error ? cause.name : "";
      setError(name === "NotAllowedError" || name === "SecurityError" ? MSG.SCAN_CAMERA_DENIED : name === "NotFoundError" || name === "OverconstrainedError" ? MSG.SCAN_CAMERA_MISSING : MSG.SCAN_CAMERA_BUSY);
    }
  };

  const selectTab = (next: "camera" | "photo") => {
    cancel(); setTab(next); setError(""); setFileName("");
  };
  const reset = () => {
    cancel(); accepted.current = false; setResult(null); setError(""); setCopied(""); setFileName("");
    // Let the restored tab render, then return keyboard users to the task.
    requestAnimationFrame(() => document.getElementById(`scan-tab-${tab}`)?.focus());
  };
  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); setError(""); }
    catch { setError(MSG.SCAN_COPY_FAILED); }
  };

  return <section className={s.scanner} aria-label="Сканер QR-кода" aria-busy={busy}>
    {result ? <div className={`${s.result} ym-hide-content`}>
      <div className={s.resultTop}><p><span aria-hidden="true">✓</span> QR-код распознан</p><span>{labels[result.type]}</span></div>
      <h2 ref={resultRef} tabIndex={-1}>{result.domain || (result.type === "WIFI" ? result.wifi?.ssid : result.type === "VCARD" ? result.contact?.name || "Контакт" : "Содержимое QR-кода")}</h2>
      {result.type === "URL" && <p className={s.warning}>Проверьте домен перед переходом. Сайт по ссылке может принадлежать третьим лицам; сканер не подтверждает его безопасность.</p>}
      {result.warnings.map(warning => <p className={s.warning} key={warning}>{warning}</p>)}
      {result.wifi && <dl className={s.fields}><div><dt>Сеть</dt><dd>{result.wifi.ssid}</dd></div><div><dt>Шифрование</dt><dd>{result.wifi.encryption === "nopass" ? "Без пароля" : result.wifi.encryption}</dd></div><div><dt>Пароль</dt><dd>{result.wifi.password || "Не указан"}</dd></div>{result.wifi.hidden && <div><dt>Скрытая сеть</dt><dd>Да</dd></div>}</dl>}
      {result.contact && <dl className={s.fields}><div><dt>Имя</dt><dd>{result.contact.name || "Не указано"}</dd></div>{result.contact.phones.map((phone,index) => <div key={`phone-${index}`}><dt>Телефон</dt><dd>{phone}</dd></div>)}{result.contact.emails.map((email,index) => <div key={`email-${index}`}><dt>Email</dt><dd>{email}</dd></div>)}</dl>}
      <label className={s.rawLabel} htmlFor="scan-content">{result.type === "URL" ? "Полный адрес" : "Исходное содержимое"}</label>
      <textarea id="scan-content" className={`fk-input ${s.raw}`} value={result.raw} readOnly rows={result.type === "URL" ? 2 : 4} spellCheck={false} dir="auto" />
      <div className={s.actions}>
        <Button type="button" onClick={() => void copy(result.raw, "content")}>{copied === "content" ? "Скопировано" : "Скопировать"}</Button>
        {result.url && <a className="fk-button fk-button--secondary" href={result.url} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer">Открыть <span aria-hidden="true">↗</span></a>}
        {result.wifi?.password && <Button type="button" variant="secondary" onClick={() => void copy(result.wifi!.password, "password")}>{copied === "password" ? "Пароль скопирован" : "Скопировать пароль"}</Button>}
        <Button type="button" variant="ghost" onClick={reset}>Сканировать ещё</Button>
      </div>
      <p className={s.generatorLink}>{result.type === "WIFI" ? <Link href="/qr-wifi">Сделать такой же код для своей сети →</Link> : <>Нужен свой QR-код? <Link href="/#create-qr">Создайте статический бесплатно, без регистрации, в PNG или SVG</Link>.</>}</p>
    </div> : <>
      <div className={s.tabs} role="tablist" aria-label="Источник QR-кода">{([['camera','Камера'],['photo','Фото или скриншот']] as const).map(([value,label]) => <button type="button" role="tab" id={`scan-tab-${value}`} aria-controls={`scan-panel-${value}`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} key={value} onClick={() => selectTab(value)} onKeyDown={event => { if (["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "camera" : event.key === "End" ? "photo" : tab === "camera" ? "photo" : "camera"; selectTab(next); document.getElementById(`scan-tab-${next}`)?.focus(); } }}>{label}</button>)}</div>
      {tab === "camera" ? <div id="scan-panel-camera" role="tabpanel" aria-labelledby="scan-tab-camera" className={s.panel}>
        <div className={`${s.camera} ${active ? s.cameraActive : ""}`}>
          <video ref={videoRef} muted playsInline autoPlay aria-label="Предпросмотр камеры" className="ym-hide-content" hidden={!active} />
          {active ? <div className={s.viewfinder} aria-hidden="true" /> : <div className={s.empty}><CameraIcon/><h2>{busy ? "Ожидаем доступ к камере" : "Наведите камеру на QR-код"}</h2><p>Разрешение потребуется только после нажатия кнопки.</p><Button type="button" disabled={busy} onClick={() => void startCamera(device)}>{busy ? "Подключаем камеру…" : "Включить камеру"}</Button><button type="button" className={s.textButton} onClick={() => selectTab("photo")}>Или выбрать фото</button></div>}
        </div>
        {(active || busy) && <div className={s.cameraControls}>{cameras.length > 1 && active && <label>Камера<select className="fk-input" value={device} onChange={event => void startCamera(event.target.value)}>{cameras.map((camera,index) => <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `Камера ${index + 1}`}</option>)}</select></label>}<p role="status">{active ? "Ищем QR-код. Держите камеру ровно и дождитесь фокусировки." : "Подтвердите запрос браузера или отмените подключение."}</p><Button type="button" variant="secondary" onClick={cancel}>{active ? "Выключить камеру" : "Отменить"}</Button></div>}
      </div> : <div id="scan-panel-photo" role="tabpanel" aria-labelledby="scan-tab-photo" className={s.panel}>
        <div className={`${s.drop} ${dragging ? s.dragging : ""}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void readFile(file); }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m4 18 5-5 4 3 4-7 4 5"/></svg>
          <h2>{busy ? "Распознаём QR-код…" : "Перетащите фото с QR-кодом"}</h2><p>{busy ? "Обрабатываем изображение в вашем браузере." : "Фото, скриншот или сохранённая картинка"}</p>
          <Button type="button" onClick={() => fileRef.current?.click()}>{busy ? "Выбрать другой файл" : "Выбрать файл"}</Button><p className={s.hint}>или нажмите Ctrl+V / ⌘V</p><small>PNG, JPEG, WebP, GIF, BMP · до 20 МБ</small>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" aria-label="Выбрать изображение с QR-кодом" className={s.fileInput} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void readFile(file); }} />
        </div>
        {fileName && <p className={`${s.fileName} ym-hide-content`}>{fileName}</p>}
      </div>}
      <ul className={s.assurances}><li>Без регистрации</li><li>Обработка в браузере</li><li>Ссылки не открываются сами</li></ul>
    </>}
    {error && <p className={s.error} role="alert">{error}</p>}
    <span role="status" className="sr-only">{copied ? "Скопировано в буфер обмена" : ""}</span>
  </section>;
}
