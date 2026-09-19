"use client";

import { useMemo, useRef, useState } from "react";
import { groupLabels, type QrTypeInfo } from "@/lib/qr-types";
import { CreateTypeLink } from "./create-type-link";
import { Button, Input } from "@/components/ui";
import styles from "./create-flow.module.css";

type Item = QrTypeInfo & { locked: boolean; lockHint?: string };
const GROUP_ORDER = ["basic", "files", "business", "social"] as const;

export function CreateTypePicker({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<"all" | (typeof GROUP_ORDER)[number]>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => items.filter((item) => (group === "all" || item.group === group)
    && `${item.label} ${item.description} ${item.type}`.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru"))), [items, query, group]);
  const featured = !query.trim() && group === "all" ? items.find((item) => item.type === "URL") : undefined;
  const sections = GROUP_ORDER.map((key) => ({ key, label: groupLabels[key], items: filtered.filter((item) => item.group === key) })).filter((section) => section.items.length);
  function reset() { setQuery(""); setGroup("all"); searchRef.current?.focus(); }

  return <div className={styles.picker}>
    {featured && <CreateTypeLink {...featured} featured />}
    <div className={styles.toolbar}>
      <div className={styles.filters} role="group" aria-label="Группы типов QR">
        {(["all", ...GROUP_ORDER] as const).filter((key) => key === "all" || items.some((item) => item.group === key)).map((key) => <button key={key} type="button" aria-pressed={group === key} onClick={() => setGroup(key)}>{key === "all" ? "Все типы" : groupLabels[key]}</button>)}
      </div>
      <div className={styles.search}><Input ref={searchRef} type="search" placeholder="Найти тип: PDF, Wi-Fi…" aria-label="Поиск типа QR" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    </div>
    <p className={styles.results} role="status">{query.trim() || group !== "all" ? `Найдено типов: ${filtered.length}` : "Выберите, что откроется при сканировании"}</p>
    {filtered.length === 0 ? <div className={styles.empty}><h2>Такого типа пока не нашли</h2><p>Попробуйте другое название или вернитесь ко всем типам.</p><Button variant="secondary" onClick={reset}>Сбросить поиск и фильтр</Button></div>
      : sections.map((section) => <section className={styles.section} key={section.key} aria-labelledby={`create-group-${section.key}`}><h2 id={`create-group-${section.key}`}>{section.label}<span>{section.items.length}</span></h2><div className={styles.typeGrid}>{section.items.map((item) => <CreateTypeLink key={item.type} {...item} />)}</div></section>)}
  </div>;
}
