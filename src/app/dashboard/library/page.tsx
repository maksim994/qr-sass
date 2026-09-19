import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { contentTypeLabels } from "@/lib/qr-types";
import QrLibrary from "@/components/qr-library";
import { getEntitlements } from "@/lib/entitlements";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { LIBRARY_PAGE_SIZE, parseLibraryQuery } from "@/lib/library-query";
import { qrPublicPath } from "@/lib/safe-redirect";

type Props = {
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>;
};

export default async function LibraryPage({ searchParams }: Props) {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const query = parseLibraryQuery(await searchParams);
  const db = getDb();
  const entitlements = await getEntitlements(workspace.id);
  const plan = entitlements.plan;

  const where: Prisma.QrCodeWhereInput = {
    workspaceId: workspace.id,
    isArchived: false,
  };
  if (query.kind !== "ALL") where.kind = query.kind;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { shortCode: { contains: query.q, mode: "insensitive" } },
      { currentTargetUrl: { contains: query.q, mode: "insensitive" } },
      { encodedContent: { contains: query.q, mode: "insensitive" } },
      { payload: { path: ["url"], string_contains: query.q, mode: "insensitive" } },
    ];
  }

  const total = await db.qrCode.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);

  const qrCodes = await db.qrCode.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * LIBRARY_PAGE_SIZE,
    take: LIBRARY_PAGE_SIZE,
    include: { _count: { select: { scanEvents: true } } },
  });

  const items = qrCodes.map((qr) => ({
    id: qr.id,
    name: qr.name,
    kind: qr.kind,
    contentType: qr.contentType,
    createdAt: qr.createdAt.toISOString(),
    expireAt: qr.expireAt ? qr.expireAt.toISOString() : null,
    currentTargetUrl: qr.currentTargetUrl,
    shortCode: qr.shortCode,
    encodedContent: qr.encodedContent,
    publicPath: qr.shortCode ? qrPublicPath({ shortCode: qr.shortCode, contentType: qr.contentType }) : null,
    _count: qr._count,
  }));

  return (
    <div>
      <DashboardPageHeader
        title="Мои QR-коды"
        description="Создавайте, скачивайте и управляйте своими кодами в одном месте."
        action={
          <Link href="/dashboard/create" className="fk-button fk-button--primary">
            Создать QR-код
          </Link>
        }
      />

      <QrLibrary
        items={items}
        contentTypeLabels={contentTypeLabels}
        exportFormats={plan.limits.exportFormats}
        query={{ ...query, page }}
        total={total}
        pageSize={LIBRARY_PAGE_SIZE}
      />
    </div>
  );
}
