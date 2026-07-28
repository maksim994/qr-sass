import Link from "next/link";
import { getDb } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page";

const quickLinks = [
  {
    href: "/admin/users",
    title: "Пользователи",
    description: "Управление пользователями и тарифами",
    icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
  {
    href: "/admin/qr",
    title: "QR-коды",
    description: "Все созданные QR-коды в системе",
    icon: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z",
  },
  {
    href: "/admin/plans",
    title: "Тарифы",
    description: "Параметры лимитов тарифных планов",
    icon: "M2.25 18.75c0-2.485 2.099-4.5 4.688-4.5s4.688 2.015 4.688 4.5-2.099 4.5-4.688 4.5-4.688-2.015-4.688-4.5zM8.25 6.75c-1.624 0-2.906 1.297-2.906 2.938s1.282 2.938 2.906 2.938 2.906-1.297 2.906-2.938S9.874 6.75 8.25 6.75z",
  },
  {
    href: "/admin/blog",
    title: "Блог",
    description: "Статьи для SEO-продвижения",
    icon: "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h.75m-1.5 0h.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 4.5h.008v.008H12v-.008z",
  },
  {
    href: "/admin/admins",
    title: "Администраторы",
    description: "Управление правами администраторов",
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  },
  {
    href: "/admin/site-settings",
    title: "Настройки сайта",
    description: "Яндекс Метрика, код в head",
    icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z",
  },
];

export default async function AdminOverviewPage() {
  const db = getDb();
  const [userCount, workspaceCount, qrCount, blogPostCount] = await Promise.all([
    db.user.count(),
    db.workspace.count(),
    db.qrCode.count({ where: { isArchived: false } }),
    db.blogPost.count(),
  ]);

  const stats = [
    {
      label: "Пользователей",
      value: userCount,
      href: "/admin/users",
      icon: "M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122z",
    },
    {
      label: "Рабочих пространств",
      value: workspaceCount,
      icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z",
    },
    {
      label: "QR-кодов",
      value: qrCount,
      href: "/admin/qr",
      icon: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z",
    },
    {
      label: "Статей блога",
      value: blogPostCount,
      href: "/admin/blog",
      icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    },
  ];

  return (
    <div>
      <AdminPageHeader title="Обзор" description="Статистика системы. Нажмите на карточку для перехода в раздел." />

      <div className="qrs-dash-stat-grid qrs-grid-3">
        {stats.map((stat) => {
          const card = (
            <div className="qrs-dash-stat-card qrs-card-lift">
              <span className="qrs-dash-stat-icon" style={{ background: "var(--color-primary-subtle)", color: "var(--color-primary)" }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={stat.icon} />
                </svg>
              </span>
              <div>
                <div className="tnum" style={{ font: "var(--fw-extra) 1.9rem/1 var(--font-display)", color: "var(--text-strong)" }}>
                  {stat.value}
                </div>
                <div style={{ marginTop: "5px", font: "var(--fw-medium) 13px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>
                  {stat.label}
                </div>
              </div>
            </div>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="qrs-row-lift" style={{ display: "block" }}>
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>

      <h2 style={{ marginTop: "32px", font: "var(--fw-bold) 1.25rem/1.2 var(--font-display)", color: "var(--text-strong)" }}>
        Разделы
      </h2>
      <div style={{ marginTop: "16px", display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="qrs-row-lift"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "12px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span className="qrs-dash-stat-icon" style={{ width: 44, height: 44, borderRadius: 10, background: "var(--color-primary-subtle)", color: "var(--color-primary)" }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={link.icon} />
              </svg>
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: "var(--fw-bold) 15px/1.2 var(--font-display)", color: "var(--text-strong)" }}>{link.title}</div>
              <div style={{ marginTop: "4px", font: "var(--fw-medium) 12px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>{link.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
