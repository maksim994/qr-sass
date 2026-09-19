"use client";

import { useEffect, useRef, useState } from "react";
import { MSG } from "@/lib/user-messages";
import styles from "./copy-button.module.css";

export function CopyButton({ value, label = "Скопировать" }: { value: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "copied" | "error">("idle");
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    if (pending.current) return;
    pending.current = true; setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied"); timer.current = setTimeout(() => setStatus("idle"), 2500);
    } catch { setStatus("error"); }
    finally { pending.current = false; }
  }
  return <div className={styles.wrap}><button type="button" className="fk-button fk-button--secondary fk-button--sm" onClick={() => void copy()} disabled={status === "pending"}>{status === "copied" ? "Скопировано" : status === "pending" ? "Копируем…" : label}</button><span role="status" className={status === "error" ? styles.error : "sr-only"}>{status === "error" ? MSG.COPY_FAILED : status === "copied" ? "Скопировано в буфер обмена" : ""}</span></div>;
}
