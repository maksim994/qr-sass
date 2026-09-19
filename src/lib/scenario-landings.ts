export const SCENARIO_LANDING_SLUGS = ["qr-menu", "qr-for-packaging"] as const;

export type ScenarioLandingSlug = (typeof SCENARIO_LANDING_SLUGS)[number];

export type ScenarioLanding = {
  slug: ScenarioLandingSlug;
  title: string;
  description: string;
  heading: string;
  lead: string;
  bullets: string[];
  steps: { title: string; text: string }[];
  limits: string[];
  placeholder: string;
  hint: string;
  submitLabel: string;
  defaultKind: "DYNAMIC";
  secondary: {
    guestHref: string;
    signedInHref: string;
    label: string;
  };
  sibling: { href: string; label: string };
  keywords: string[];
};

const MENU_HOSTED_NEXT = "/dashboard/create/menu";
const PDF_HOSTED_NEXT = "/dashboard/create/pdf";

export const scenarioLandings: Record<ScenarioLandingSlug, ScenarioLanding> = {
  "qr-menu": {
    slug: "qr-menu",
    title: "QR-меню: меняйте блюда без новой печати",
    description:
      "Один динамический QR на столе. Блюда и цены обновляете в кабинете — гостю не нужна новая наклейка.",
    heading: "Меню по QR, которое меняется без новой печати",
    lead: "Вставьте ссылку на актуальное меню. Код на столе остаётся тем же: в кабинете меняете адрес, когда обновили блюда или цены.",
    bullets: [
      "Один QR на столике — гость всегда открывает текущую версию",
      "Смена ссылки без новой печати наклейки",
      "Открытия по календарным дням и устройству, без карты зала",
      "PNG и SVG для экрана и типографии",
    ],
    steps: [
      { title: "Вставьте ссылку на меню", text: "Сайт, PDF в облаке или страница, которую уже показываете гостям." },
      { title: "Сохраните динамический QR и скачайте файл", text: "PNG или SVG. Пока код не сохранён, назначение после печати не сменить." },
      { title: "Проверьте камерой и наклейте", text: "Когда обновили блюда — смените URL в кабинете. Макет тот же." },
    ],
    limits: [
      "Бесплатный тариф — только статический QR: ссылку после печати не сменить.",
      "Смена адреса и открытия — на Про. Проба динамики 14 дней, карта не нужна.",
      "После окончания пробы уже напечатанный динамический код продолжает открываться. Новые коды и смена назначения — после оплаты.",
    ],
    placeholder: "https://cafe.example/menu",
    hint: "Поле пустое специально: подсказка — пример, не готовый адрес. После регистрации вернёмся к вашей ссылке.",
    submitLabel: "Создать QR для меню",
    defaultKind: "DYNAMIC",
    secondary: {
      guestHref: `/register?next=${encodeURIComponent(MENU_HOSTED_NEXT)}`,
      signedInHref: MENU_HOSTED_NEXT,
      label: "Нет своей страницы меню? Соберите тип «Меню» в кабинете",
    },
    sibling: { href: "/qr-for-packaging", label: "QR на упаковке" },
    keywords: ["qr меню", "меню ресторана qr", "цифровое меню", "qr код для кафе"],
  },
  "qr-for-packaging": {
    slug: "qr-for-packaging",
    title: "QR на упаковке: инструкция после тиража",
    description:
      "Печатаете код один раз. Инструкцию, акцию или отзывы меняете в кабинете — без нового тиража.",
    heading: "QR на упаковке: инструкция после тиража",
    lead: "Вставьте ссылку на инструкцию, карточку товара или акцию. После печати тиража назначение меняете в кабинете.",
    bullets: [
      "Тираж уже напечатан — ссылку всё равно можно сменить",
      "Ведите на инструкцию, розыгрыш или карточку товара",
      "UTM в вашей ссылке помогает отличить кампании в рекламе",
      "PNG и SVG для макета; PDF и EPS на платных тарифах — растровая картинка",
    ],
    steps: [
      { title: "Вставьте ссылку назначения", text: "Инструкция, лендинг акции или страница товара — обычный http или https." },
      { title: "Сохраните динамический QR до печати", text: "В файл попадёт короткая ссылка QR-S. Статику после тиража уже не перенаправить." },
      { title: "Проверьте камерой, затем в макет", text: "Когда обновили инструкцию — смените URL. Упаковка та же." },
    ],
    limits: [
      "Бесплатный тариф — только статика. Для смены ссылки после тиража нужен Про.",
      "Проба динамики 14 дней. Карта не нужна.",
      "Окончание тарифа не отключает уже напечатанный динамический QR. Удаление кода из библиотеки — отключает.",
    ],
    placeholder: "https://brand.example/instruction",
    hint: "Не подставляем пример как настоящий адрес: получится мусорный QR. После регистрации вернёмся к вашей ссылке.",
    submitLabel: "Создать QR для упаковки",
    defaultKind: "DYNAMIC",
    secondary: {
      guestHref: `/register?next=${encodeURIComponent(PDF_HOSTED_NEXT)}`,
      signedInHref: PDF_HOSTED_NEXT,
      label: "Нет онлайн-инструкции? Загрузите PDF в кабинете",
    },
    sibling: { href: "/qr-menu", label: "QR-меню для кафе" },
    keywords: ["qr на упаковке", "qr код товара", "qr инструкция", "динамический qr упаковка"],
  },
};

export function getScenarioLanding(slug: string): ScenarioLanding | undefined {
  if (slug === "qr-menu" || slug === "qr-for-packaging") {
    return scenarioLandings[slug];
  }
  return undefined;
}

export function isScenarioLandingSlug(slug: string): slug is ScenarioLandingSlug {
  return slug === "qr-menu" || slug === "qr-for-packaging";
}
