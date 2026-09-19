export const LIBRARY_PAGE_SIZE = 24;

export type LibraryKindFilter = "ALL" | "STATIC" | "DYNAMIC";

export type LibraryQuery = {
  q: string;
  kind: LibraryKindFilter;
  page: number;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseLibraryQuery(searchParams: {
  q?: string | string[];
  kind?: string | string[];
  page?: string | string[];
}): LibraryQuery {
  const q = firstParam(searchParams.q).trim().slice(0, 200);
  const kindRaw = firstParam(searchParams.kind).toUpperCase();
  const kind: LibraryKindFilter = kindRaw === "STATIC" || kindRaw === "DYNAMIC" ? kindRaw : "ALL";
  const pageNum = Number.parseInt(firstParam(searchParams.page), 10);
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  return { q, kind, page };
}

export function libraryHref(query: Partial<LibraryQuery> & { q?: string; kind?: LibraryKindFilter; page?: number }): string {
  const params = new URLSearchParams();
  const q = (query.q ?? "").trim();
  if (q) params.set("q", q);
  if (query.kind && query.kind !== "ALL") params.set("kind", query.kind);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `/dashboard/library?${qs}` : "/dashboard/library";
}

export function libraryDestination(item: {
  kind: "STATIC" | "DYNAMIC";
  currentTargetUrl: string | null;
  shortCode: string | null;
  encodedContent?: string | null;
  publicPath?: string | null;
}): string {
  if (item.currentTargetUrl?.trim()) return item.currentTargetUrl.trim();
  if (item.kind === "STATIC") {
    const encoded = item.encodedContent?.trim();
    if (encoded) return encoded;
    return "Зашито в код";
  }
  if (item.publicPath?.trim()) return item.publicPath.trim();
  if (item.shortCode) return `/r/${item.shortCode}`;
  return "Назначение не задано";
}

export function libraryStatus(item: {
  kind: "STATIC" | "DYNAMIC";
  expireAt: string | Date | null;
  now?: Date;
}): string {
  const now = item.now ?? new Date();
  if (item.expireAt && new Date(item.expireAt).getTime() <= now.getTime()) return "Срок истёк";
  return item.kind === "DYNAMIC" ? "Динамический" : "Статический";
}
