import { getPlan } from "@/lib/plans";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import {
  getSeoPageCatalog,
  getSeoPageCatalogEntry,
  type SeoPageCatalogEntry,
  pricingSeoDefaults,
} from "@/lib/seo-page-registry";
import {
  mergeSeoFields,
  type SeoOverrideSnapshot,
} from "@/lib/seo-page-fields";
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
  const [catalog, overrides, pro] = await Promise.all([
    Promise.resolve(getSeoPageCatalog()),
    db.seoPageOverride.findMany(),
    getPlan("PRO"),
  ]);
  const byPath = new Map(overrides.map((row) => [row.path, row]));
  const pricing = pricingSeoDefaults(pro.priceRub);
  return catalog.map((catalogEntry) => {
    const entry = catalogEntry.path === "/pricing"
      ? { ...catalogEntry, ...pricing, title: `${pricing.title} | qr-s.ru` }
      : catalogEntry;
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
  expectedUpdatedAt: string | null,
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
  let updatedAt: Date;
  try {
    updatedAt = await db.$transaction(async (tx) => {
      // Keep empty rows versioned too: clearing fields must not erase the version.
      // Conditional UPDATE takes the row lock before revision numbering, so concurrent
      // edits and restores cannot both claim the same version.
      const nextUpdatedAt = new Date(Math.max(Date.now(), expectedUpdatedAt ? Date.parse(expectedUpdatedAt) + 1 : 0));
      if (expectedUpdatedAt === null) {
        await tx.seoPageOverride.create({ data: { path: normalized, ...snapshot, updatedAt: nextUpdatedAt } });
      } else {
        const claimed = await tx.seoPageOverride.updateMany({
          where: { path: normalized, updatedAt: new Date(expectedUpdatedAt) },
          data: { ...snapshot, updatedAt: nextUpdatedAt },
        });
        if (claimed.count !== 1) throw new SeoPageConflictError();
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

      return nextUpdatedAt;
    });
  } catch (error) {
    // Two first-time editors may race to create the same path. Rollback leaves
    // the winner and its history untouched; report the loser as a normal conflict.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new SeoPageConflictError();
    throw error;
  }
  return { updatedAt: updatedAt.toISOString() };
}

export async function restoreSeoPageRevision(
  path: string,
  revisionId: string,
  actor: Actor,
  expectedUpdatedAt: string | null,
): Promise<{ updatedAt: string }> {
  const normalized = sitemapPathname(path);
  const revision = await getDb().seoPageOverrideRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.path !== normalized) throw new SeoPageNotFoundError();
  const snapshot = revision.snapshot as SeoOverrideSnapshot;
  return saveSeoPageOverride(normalized, snapshot, actor, expectedUpdatedAt);
}
