import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import {
  getSeoPageCatalog,
  getSeoPageCatalogEntry,
  type SeoPageCatalogEntry,
} from "@/lib/seo-page-registry";
import {
  invalidateSeoPageOverrideCache,
  mergeSeoFields,
  snapshotIsEmpty,
  type SeoOverrideSnapshot,
} from "@/lib/seo-page-overrides";
import { sitemapPathname } from "@/lib/seo-hygiene";

type Actor = { actorId: string; actorName: string };

export type SeoPageAdminRow = SeoPageCatalogEntry & {
  override: SeoOverrideSnapshot | null;
  resolved: ReturnType<typeof mergeSeoFields>;
  updatedAt: string | null;
};

export type SeoPageRevisionListItem = {
  id: string;
  number: number;
  actorName: string;
  createdAt: string;
  snapshot: SeoOverrideSnapshot;
};

function rowToSnapshot(row: {
  metaTitle: string | null;
  metaDescription: string | null;
  heading: string | null;
  noindex: boolean | null;
}): SeoOverrideSnapshot {
  return {
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    heading: row.heading,
    noindex: row.noindex,
  };
}

export async function listSeoPageAdminRows(): Promise<SeoPageAdminRow[]> {
  const db = getDb();
  const [catalog, overrides] = await Promise.all([
    Promise.resolve(getSeoPageCatalog()),
    db.seoPageOverride.findMany(),
  ]);
  const byPath = new Map(overrides.map((row) => [row.path, row]));
  return catalog.map((entry) => {
    const overrideRow = byPath.get(entry.path);
    const override = overrideRow ? rowToSnapshot(overrideRow) : null;
    return {
      ...entry,
      override,
      resolved: mergeSeoFields(entry, override),
      updatedAt: overrideRow?.updatedAt.toISOString() ?? null,
    };
  });
}

export async function listSeoPageRevisions(path: string): Promise<SeoPageRevisionListItem[]> {
  const normalized = sitemapPathname(path);
  const rows = await getDb().seoPageOverrideRevision.findMany({
    where: { path: normalized },
    orderBy: [{ number: "desc" }],
    take: 30,
  });
  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    actorName: row.actorName,
    createdAt: row.createdAt.toISOString(),
    snapshot: row.snapshot as SeoOverrideSnapshot,
  }));
}

async function nextRevisionNumber(tx: Prisma.TransactionClient, path: string): Promise<number> {
  const latest = await tx.seoPageOverrideRevision.findFirst({
    where: { path },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (latest?.number ?? 0) + 1;
}

export class SeoPageConflictError extends Error {
  constructor() {
    super("CONFLICT");
  }
}

export class SeoPageNotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
  }
}

export async function saveSeoPageOverride(
  path: string,
  input: SeoOverrideSnapshot,
  actor: Actor,
  expectedUpdatedAt?: string | null,
): Promise<{ updatedAt: string }> {
  const normalized = sitemapPathname(path);
  if (!getSeoPageCatalogEntry(normalized)) throw new SeoPageNotFoundError();

  const snapshot: SeoOverrideSnapshot = {
    metaTitle: input.metaTitle?.trim() ? input.metaTitle.trim() : null,
    metaDescription: input.metaDescription?.trim() ? input.metaDescription.trim() : null,
    heading: input.heading?.trim() ? input.heading.trim() : null,
    noindex: input.noindex,
  };

  const db = getDb();
  const result = await db.$transaction(async (tx) => {
    const current = await tx.seoPageOverride.findUnique({ where: { path: normalized } });
    if (expectedUpdatedAt) {
      const expected = new Date(expectedUpdatedAt).getTime();
      const actual = current?.updatedAt.getTime() ?? 0;
      if (!current || expected !== actual) throw new SeoPageConflictError();
    }

    let row = current;
    if (snapshotIsEmpty(snapshot)) {
      if (current) await tx.seoPageOverride.delete({ where: { path: normalized } });
      row = null;
    } else if (current) {
      row = await tx.seoPageOverride.update({
        where: { path: normalized },
        data: snapshot,
      });
    } else {
      row = await tx.seoPageOverride.create({
        data: { path: normalized, ...snapshot },
      });
    }

    const number = await nextRevisionNumber(tx, normalized);
    await tx.seoPageOverrideRevision.create({
      data: {
        path: normalized,
        number,
        snapshot,
        actorId: actor.actorId,
        actorName: actor.actorName,
      },
    });

    return row;
  });

  invalidateSeoPageOverrideCache();
  return { updatedAt: result?.updatedAt.toISOString() ?? new Date().toISOString() };
}

export async function restoreSeoPageRevision(
  path: string,
  revisionId: string,
  actor: Actor,
  expectedUpdatedAt?: string | null,
): Promise<{ updatedAt: string }> {
  const normalized = sitemapPathname(path);
  const revision = await getDb().seoPageOverrideRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.path !== normalized) throw new SeoPageNotFoundError();
  const snapshot = revision.snapshot as SeoOverrideSnapshot;
  return saveSeoPageOverride(normalized, snapshot, actor, expectedUpdatedAt);
}
