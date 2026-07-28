import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { selectWorkspace } from "@/lib/workspace-select";
import { getDb } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { getDisabledQrTypes, isQrTypeDisabled } from "@/lib/disabled-qr-types";
import { qrTypes } from "@/lib/qr-types";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Alert } from "@/components/ui";
import { CreateTypePicker } from "@/components/dashboard/create-type-picker";

export default async function CreatePage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const disabled = await getDisabledQrTypes();
  const enabledTypes = qrTypes.filter((t) => !isQrTypeDisabled(t.type, disabled));

  const db = getDb();
  const [planInfo, totalQr] = await Promise.all([
    getPlan(workspace.plan),
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
  ]);
  const qrLimit = planInfo.limits.maxQrCodes;
  const qrRemaining = qrLimit == null ? null : Math.max(0, qrLimit - totalQr);
  const limitReached = qrLimit != null && totalQr >= qrLimit;

  const pickerItems = enabledTypes.map((item) => {
    const needsPaid = item.needsHostedPage || item.type === "VCARD";
    const locked = limitReached || (needsPaid && !planInfo.limits.allowsDynamic);
    return {
      ...item,
      locked,
      lockHint: limitReached
        ? "Лимит тарифа"
        : needsPaid && !planInfo.limits.allowsDynamic
          ? "Нужен Про"
          : undefined,
    };
  });

  return (
    <div>
      <DashboardPageHeader
        title="Создать QR-код"
        description="Выберите тип контента — дальше настроите дизайн, срок действия и аналитику."
      />

      {(limitReached || (qrRemaining != null && qrRemaining <= 3) || !planInfo.limits.allowsDynamic) ? (
        <div className="qrs-create-alerts">
          {limitReached ? (
            <Alert variant="warning" title="Лимит тарифа">
              Создано {totalQr} из {qrLimit} QR.{" "}
              <Link href="/dashboard/billing" className="qrs-navlink">
                Обновите тариф
              </Link>{" "}
              или удалите ненужные коды в библиотеке.
            </Alert>
          ) : qrRemaining != null && qrRemaining <= 3 ? (
            <Alert variant="info" title="Осталось мало слотов">
              Можно создать ещё {qrRemaining} QR на текущем тарифе.{" "}
              <Link href="/dashboard/billing" className="qrs-navlink">
                Смотреть тарифы
              </Link>
            </Alert>
          ) : null}

          {!planInfo.limits.allowsDynamic ? (
            <Alert variant="info" title="Бесплатный тариф — только статика">
              Динамические QR, меню, файлы и аналитика сканов доступны на Про.{" "}
              <Link href="/dashboard/billing" className="qrs-navlink">
                Перейти на Про
              </Link>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {enabledTypes.length === 0 ? (
        <Alert variant="warning" title="Создание недоступно">
          Создание QR-кодов временно отключено. Обратитесь к администратору.
        </Alert>
      ) : (
        <CreateTypePicker items={pickerItems} />
      )}
    </div>
  );
}
