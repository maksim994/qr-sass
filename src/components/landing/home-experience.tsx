"use client";

import Link from "next/link";
import { useState } from "react";
import type { QrTypeInfo } from "@/lib/qr-types";
import { HomeQrPreview } from "./home-qr-preview";
import { Button } from "@/components/ui/button";
import s from "./home-experience.module.css";

const scenes = [
  { name: "Для кафе", title: "Хороший день\nначинается здесь.", label: "МЕНЮ / EVERYDAY CAFÉ", phone: "Everyday café", subtitle: "Время для чего-то вкусного", items: ["Завтраки весь день", "Кофе и другие радости", "Десерты к разговору"], href: "/qr-menu", kind: "menu" },
  { name: "Для бренда", title: "У вещей\nесть история.", label: "КОЛЛЕКЦИЯ / OBJECT STUDIO", phone: "Object studio", subtitle: "Больше, чем просто покупка", items: ["История вашей вещи", "Бережный уход", "Новая коллекция"], href: "/qr-for-packaging", kind: "shop" },
  { name: "Для экспертов", title: "Давайте\nбудем на связи.", label: "КОНТАКТЫ / ALEX MORO", phone: "Алекс Морó", subtitle: "Дизайнер. Создаю простые вещи.", items: ["Посмотреть портфолио", "Написать на почту", "Мы в социальных сетях"], href: "/#types", kind: "person" },
];

function Icon({ path, className }: { path: string; className?: string }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
}
const arrow = "M5 12h14m-6-6 6 6-6 6";

export function HomeHero() {
  const [selected, setSelected] = useState(2);
  const scene = scenes[selected];
  return <section className={s.hero} aria-labelledby="home-title">
    <div className={s.heroCopy}>
      <h1 id="home-title" tabIndex={-1}>Маленький код.<br /><span>Большие<br className={s.heroBreak} /> возможности.</span></h1>
      <p>Соедините то, что рядом, с тем, что онлайн. Сайт, контакты, программа события или история вашего бренда — в одном QR-коде.</p>
      <div className={s.heroActions}><Button href="#create-qr" variant="primary" size="lg">Создать QR-код <Icon path={arrow} /></Button><a href="#use-cases">Посмотреть возможности <span aria-hidden="true">↘</span></a></div>
      <div className={s.heroNote}><span aria-hidden="true">✓</span> Есть бесплатный тариф <i /> Без карты для старта</div>
    </div>
    <div className={s.heroExperience}>
      <div className={s.sceneTabs} role="group" aria-label="Пример использования QR">{scenes.map((item, index) => <button type="button" key={item.name} aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.name}</button>)}</div>
      <div className={s.scene} data-scene={scene.kind}>
        <div className={s.orbit} aria-hidden="true" />
        <div className={s.paper} key={`paper-${selected}`}><span>{scene.label}</span><strong>{scene.title}</strong><HomeQrPreview value={`https://qr-s.ru${scene.href}`} /><p>Наведите камеру.<br />Дальше — интереснее.</p><span className={s.paperBrand}>qr-s.ru <span>↗</span></span></div>
        <div className={s.phone} key={`phone-${selected}`} aria-label={`Пример страницы: ${scene.phone}`}><div className={s.phoneTop}><span>9:41</span><span>● ▰</span></div><div className={s.phonePicture}><Icon path={selected === 0 ? "M5 9h11v6a5.5 5.5 0 0 1-11 0V9Zm11 1h2a3 3 0 0 1 0 6h-2M4 21h15M8 3v2m5-2v2" : selected === 1 ? "M4 7h16v14H4V7Zm4 0V5a4 4 0 0 1 8 0v2" : "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2"} /></div><strong>{scene.phone}</strong><p>{scene.subtitle}</p><div className={s.phoneItems}>{scene.items.map(item => <div key={item}>{item}<span aria-hidden="true">↗</span></div>)}</div><span className={s.phoneBottom}>Пример страницы после сканирования</span></div>
        <div className={s.scanLabel}><Icon path="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 12h10" /><span>Один скан.<br /><strong>И вы на связи.</strong></span></div>
      </div>
      <p className={s.sceneCaption}>Выберите сценарий — посмотрите, как оживает QR <span aria-hidden="true">↑</span></p>
    </div>
  </section>;
}

export function TypeExplorer({ types, signedIn }: { types: QrTypeInfo[]; signedIn: boolean }) {
  const [group, setGroup] = useState("basic");
  const groups = [{ id: "basic", name: "На каждый день" }, { id: "files", name: "Файлы и медиа" }, { id: "business", name: "Для бизнеса" }, { id: "social", name: "Социальные сети" }].filter(item => types.some(type => type.group === item.id));
  const activeGroup = groups.some(item => item.id === group) ? group : groups[0]?.id;
  return <div className={s.typeExplorer}>
    <div className={s.filterTabs} role="group" aria-label="Категории QR-кодов">{groups.map(item => <button key={item.id} type="button" aria-pressed={activeGroup === item.id} onClick={() => setGroup(item.id)}>{item.name}</button>)}</div>
    <div className={s.typeGrid}>{types.filter(type => type.group === activeGroup).map(type => <Link key={type.type} href={signedIn ? `/dashboard/create/${type.type.toLowerCase()}` : `/register?next=${encodeURIComponent(`/dashboard/create/${type.type.toLowerCase()}`)}`}><Icon path={type.icon} /><div><h3>{type.label}</h3><p>{type.description}</p></div><span aria-hidden="true">↗</span></Link>)}</div>
    {types.length === 0 && <p>Новые типы QR-кодов скоро появятся.</p>}
  </div>;
}

export function DynamicDemo() {
  const [updated, setUpdated] = useState(false);
  return <div className={s.dynamicDemo}>
    <div className={s.demoTitle}><span>Один QR. Разное содержимое.</span><span>Демонстрация</span></div>
    <div className={s.dynamicVisual}>
      <div className={s.fixedQr}><HomeQrPreview value="https://qr-s.ru/dynamic-qr" /><span>Напечатанный QR не меняется</span></div>
      <div className={s.routeConnector} aria-hidden="true"><span /><Icon path={arrow} /></div>
      <div className={s.season} data-summer={updated}><div className={s.catalogArt} aria-hidden="true"><span /><span /><span /></div><strong>{updated ? "Новая коллекция" : "Первый каталог"}</strong><span>{updated ? "Новые товары. Тот же QR." : "Ваши товары — по одной ссылке"}</span></div>
    </div>
    <div className={s.destination} aria-live="polite"><span>Куда ведёт QR</span><strong>brand.example / {updated ? "new-collection" : "catalog"}</strong></div>
    <button type="button" className={s.demoButton} onClick={() => setUpdated(!updated)}><Icon path="M3 11a9 9 0 0 1 15.36-6.36L21 7M21 3v4h-4M21 13a9 9 0 0 1-15.36 6.36L3 17M7 17H3v4" />{updated ? "Вернуть первый каталог" : "Открыть новую коллекцию"}</button>
    <p>Нажмите, чтобы сменить назначение. Ваши коды настраиваются в кабинете.</p>
  </div>;
}

const industries = [
  { id: "events", name: "Мероприятия", type: "PDF", title: "Вся программа — у каждого гостя", copy: "Разместите QR на бейдже или афише. Программа, расписание и материалы события откроются в телефоне.", label: "Программа события", headline: "Идеи. Люди.\nНовые связи.", lines: ["10:00 · Встреча гостей", "11:00 · Главное выступление", "14:00 · Практика и общение"], icon: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 14h2m4 0h2m-8 4h2" },
  { id: "education", name: "Образование", type: "LINK_LIST", title: "Материалы, которые легко найти", copy: "Соберите ссылки на лекции, задания и полезные ресурсы. Добавьте QR в презентацию или раздаточные материалы.", label: "Материалы курса", headline: "Новые знания.\nВ удобном формате.", lines: ["Лекции и конспекты", "Практические задания", "Полезные ссылки"], icon: "m2 9 10-6 10 6-10 6L2 9Zm4 3v6c4 3 8 3 12 0v-6M22 9v8" },
  { id: "services", name: "Услуги и сервис", type: "BUSINESS", title: "Знакомство с вами — в один скан", copy: "Расскажите о компании, покажите контакты и часы работы. Код на стойке или визитке поможет клиенту вернуться к вам.", label: "Страница компании", headline: "Ваше дело.\nБлиже к клиенту.", lines: ["Услуги и контакты", "Адрес и часы работы", "Ссылки для связи"], icon: "M3 21h18M5 21V3h14v18M9 7h1m4 0h1m-6 4h1m4 0h1M9 21v-5h6v5" },
  { id: "experts", name: "Эксперты и команды", type: "VCARD", title: "Контакты остаются после встречи", copy: "Делитесь электронной визиткой на встречах, конференциях и в презентациях. Коллеге или клиенту не придётся перепечатывать номер.", label: "Электронная визитка", headline: "Приятно\nпознакомиться.", lines: ["Имя и должность", "Телефон и почта", "Компания и сайт"], icon: "M14 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 21v-3a6 6 0 0 1 12 0v3m1-14h4m-4 5h4m-3 5h3" },
  { id: "retail", name: "Магазины и бренды", type: "URL", title: "Продолжите знакомство с покупкой", copy: "Ведите с упаковки и ценника на инструкцию, каталог или страницу товара. Для меняющихся ссылок используйте динамический QR.", label: "Каталог бренда", headline: "Всё о вещах,\nкоторые вы любите.", lines: ["Коллекции и новинки", "Инструкции по уходу", "Поддержка покупателей"], icon: "M4 7h16v14H4V7Zm4 0V5a4 4 0 0 1 8 0v2" },
  { id: "food", name: "Кафе и рестораны", type: "MENU", title: "Меню всегда под рукой", copy: "Разместите QR на столике или у входа. Гости смогут открыть меню в телефоне, а вы — обновить содержимое в кабинете.", label: "Электронное меню", headline: "Хороший повод\nзадержаться.", lines: ["Завтраки и основные блюда", "Напитки и десерты", "Сезонные предложения"], icon: "M3 3v7a3 3 0 0 0 6 0V3M6 3v18M18 3c-3 3-4 7-4 10h5M19 3v18" },
];

export function IndustryShowcase({ types, signedIn }: { types: QrTypeInfo[]; signedIn: boolean }) {
  const available = industries.filter(item => types.some(type => type.type === item.type));
  const [selection, setSelection] = useState("events");
  const selected = available.find(item => item.id === selection) ?? available[0];
  if (!selected) return <p>Выберите доступный тип QR в каталоге ниже.</p>;
  const path = `/dashboard/create/${selected.type.toLowerCase()}`;
  return <div className={s.industries}>
    <div className={s.industryNav} role="group" aria-label="Сценарии по отраслям">{available.map(item => <button type="button" key={item.id} aria-pressed={selected.id === item.id} onClick={() => setSelection(item.id)}><Icon path={item.icon} /><span>{item.name}</span><span aria-hidden="true">↗</span></button>)}</div>
    <div className={s.industryContent}>
      <div className={s.industryCopy}><h3>{selected.title}</h3><p>{selected.copy}</p><Button href={signedIn ? path : `/register?next=${encodeURIComponent(path)}`} variant="secondary">Создать QR <Icon path={arrow} /></Button><span>Начните с типа «{types.find(type => type.type === selected.type)?.label}»</span></div>
      <div className={s.industryArt} data-industry={selected.id}><div className={s.industryDocument}><div className={s.documentBrand}><Icon path={selected.icon} /><span>{selected.label}</span></div><strong>{selected.headline}</strong><div className={s.documentLines}>{selected.lines.map(line => <span key={line}>{line}</span>)}</div><div className={s.documentCode}><HomeQrPreview value="https://qr-s.ru/#use-cases" /><span>Откройте<br />в телефоне ↗</span></div></div><span className={s.industryDisclaimer}>Пример оформления</span></div>
    </div>
  </div>;
}

export function DesignPlayground() {
  const [color, setColor] = useState("ink");
  const [frame, setFrame] = useState(true);
  const colors = [{ id: "ink", name: "Графит" }, { id: "blue", name: "Синий" }, { id: "green", name: "Хвойный" }, { id: "plum", name: "Сливовый" }];
  return <div className={s.designPlayground}>
    <div className={s.designCanvas} data-color={color}><div className={s.designPaper} data-frame={frame}><HomeQrPreview value="https://qr-s.ru" /><span>Здесь начинается знакомство</span></div><span className={s.canvasCaption}>Пример оформления · QR ведёт на qr-s.ru</span></div>
    <div className={s.designControls}><div><span>Цвет кода</span><div className={s.swatches} role="group" aria-label="Цвет примера QR">{colors.map(item => <button key={item.id} type="button" data-color={item.id} aria-label={item.name} aria-pressed={color === item.id} onClick={() => setColor(item.id)}>{color === item.id && <span aria-hidden="true">✓</span>}</button>)}</div></div><label className={s.frameToggle}><input type="checkbox" checked={frame} onChange={event => setFrame(event.target.checked)} /><span>Подпись под кодом</span></label></div>
  </div>;
}

export function AnalyticsDemo() {
  const [period, setPeriod] = useState<7 | 14>(7);
  const values = period === 7 ? [32, 49, 40, 68, 55, 88, 74] : [32, 49, 40, 68, 55, 88, 74, 57, 80, 93, 78, 110, 99, 125];
  return <div className={s.analyticsDemo}><div className={s.chartHeading}><div><span>Открытия QR-кода</span><strong>{values.reduce((sum, value) => sum + value, 0)} <small>за {period} дней</small></strong></div><div className={s.chartTabs} role="group" aria-label="Период примера статистики">{([7, 14] as const).map(days => <button type="button" key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} дней</button>)}</div></div><div className={s.chart} role="img" aria-label={`Демонстрация открытий по дням: ${values.join(", ")}`}><div className={s.chartBars}>{values.map((value, i) => <div key={i} style={{ height: `${value / 1.3}%` }}><span>{value}</span></div>)}</div><div className={s.chartAxis}><span>1 сентября</span><span>{period} сентября</span></div></div><div className={s.chartFoot}><span><i /> Открытия по дням</span><span>Демонстрационные данные</span></div></div>;
}

export function HomeFooterExperience({ types, signedIn }: { types: QrTypeInfo[]; signedIn: boolean }) {
  const choices = types.filter(type => ["URL", "WIFI", "VCARD", "PDF", "MENU"].includes(type.type));
  const [selected, setSelected] = useState(choices[0]?.type ?? "URL");
  const selectedType = choices.find(type => type.type === selected);
  const path = selectedType ? `/dashboard/create/${selected.toLowerCase()}` : "/dashboard/create";
  const hints: Record<string, { title: string; text: string }> = {
    URL: { title: "Ваша ссылка — ближе", text: "На сайт, страницу или новую идею" },
    WIFI: { title: "В сети за один скан", text: "Подключение без ввода пароля вручную" },
    VCARD: { title: "Будем на связи", text: "Контакты, которые удобно сохранить" },
    PDF: { title: "Документ под рукой", text: "Каталог, инструкция или программа" },
    MENU: { title: "Выбирайте с удовольствием", text: "Меню прямо в телефоне гостя" },
  };
  const hint = hints[selected] ?? hints.URL;
  return <div className={s.footerExperience}>
    <div className={s.footerStart}><div className={s.footerCopy}><h2>Есть идея?<br />Дайте ей свой QR.</h2><p>Выберите, чем хотите поделиться.<br />Остальное соберём в редакторе.</p><div className={s.footerChoices} role="group" aria-label="Тип нового QR-кода">{choices.map(type => <button key={type.type} type="button" aria-pressed={selected === type.type} onClick={() => setSelected(type.type)}><Icon path={type.icon} />{type.label}</button>)}</div><Button variant="primary" size="lg" href={signedIn ? path : `/register?next=${encodeURIComponent(path)}`}>Перейти к созданию <Icon path={arrow} /></Button></div>
      <div className={s.footerPreview} aria-live="polite"><Icon path={selectedType?.icon ?? arrow} /><strong>{hint.title}</strong><p>{hint.text}</p><div className={s.footerPreviewBottom}><span>{selectedType?.label ?? "QR-код"}<small>Выбранный тип</small></span><span aria-hidden="true">↗</span></div></div>
    </div>
    <div className={s.footerSignature}><span>От идеи до первого сканирования.</span><button type="button" onClick={() => { document.getElementById("home-title")?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}>К началу страницы <span aria-hidden="true">↑</span></button></div>
  </div>;
}
