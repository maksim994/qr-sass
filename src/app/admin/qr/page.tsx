import { getDb } from "@/lib/db";
import { Prisma, QrContentType } from "@prisma/client";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminFilters, AdminPagination } from "@/components/admin/admin-list";
import {
  listParams,
  scalar,
  adminDate,
  type AdminSearchParams,
} from "@/lib/admin-list";
import { contentTypeLabels } from "@/lib/qr-types";
import styles from "@/components/admin/admin.module.css";
export default async function AdminQrPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams,
    { q, size, page: requested } = listParams(params),
    status = scalar(params.status),
    workspace = scalar(params.workspace),
    type = scalar(params.type);
  const where: Prisma.QrCodeWhereInput = {
    ...(status === "archived"
      ? { isArchived: true }
      : status === "all"
        ? {}
        : { isArchived: false }),
    ...(workspace ? { workspaceId: workspace } : {}),
    ...(type in contentTypeLabels
      ? { contentType: type as QrContentType }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { shortCode: { contains: q, mode: "insensitive" } },
            { createdBy: { email: { contains: q, mode: "insensitive" } } },
            { id: q },
          ],
        }
      : {}),
  };
  const db = getDb(),
    total = await db.qrCode.count({ where }),
    page = Math.min(requested, Math.max(1, Math.ceil(total / size)));
  const codes = await db.qrCode.findMany({
    where,
    skip: (page - 1) * size,
    take: size,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      name: true,
      shortCode: true,
      contentType: true,
      isArchived: true,
      createdAt: true,
      workspace: { select: { id: true, name: true } },
      createdBy: { select: { id: true, email: true } },
      _count: { select: { scanEvents: true } },
    },
  });
  return (
    <>
      <AdminPageHeader
        title="QR-коды"
        description="Поиск по названию, короткому коду, ID и email создателя."
      />
      {workspace && (
        <p className={styles.note}>
          Фильтр по кабинету:{" "}
          <Link className={styles.link} href={`/admin/workspaces/${workspace}`}>
            {workspace}
          </Link>
        </p>
      )}
      <AdminFilters
        params={params}
        placeholder="Название, код, ID или email"
        filters={[
          {
            name: "status",
            label: "Статус",
            options: [
              ["", "Активные"],
              ["archived", "Архив"],
              ["all", "Все"],
            ],
          },
          {
            name: "type",
            label: "Тип",
            options: [["", "Все типы"], ...Object.entries(contentTypeLabels)],
          },
        ]}
      />
      <div className={styles.tableWrap}>
        {codes.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>QR-код</th>
                <th>Тип и статус</th>
                <th>Кабинет / создатель</th>
                <th>Сканы</th>
                <th>Создан · МСК</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((qr) => (
                <tr key={qr.id}>
                  <td data-label="QR-код">
                    <Link href={`/admin/qr/${qr.id}`}>{qr.name}</Link>
                    <small>{qr.shortCode ?? "Без короткой ссылки"}</small>
                  </td>
                  <td data-label="Тип и статус">
                    {contentTypeLabels[qr.contentType]}
                    <small>{qr.isArchived ? "В архиве" : "Активен"}</small>
                  </td>
                  <td data-label="Кабинет / создатель">
                    <Link href={`/admin/workspaces/${qr.workspace.id}`}>
                      {qr.workspace.name}
                    </Link>
                    <small>
                      <Link href={`/admin/users/${qr.createdBy.id}`}>
                        {qr.createdBy.email}
                      </Link>
                    </small>
                  </td>
                  <td data-label="Сканы">{qr._count.scanEvents}</td>
                  <td data-label="Создан · МСК">{adminDate(qr.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>
            QR-коды не найдены. Измените запрос или фильтры.
          </p>
        )}
      </div>
      <AdminPagination total={total} page={page} size={size} params={params} />
    </>
  );
}
