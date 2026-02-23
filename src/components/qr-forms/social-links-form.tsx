"use client";

const PLATFORM_OPTIONS = [
  "Instagram",
  "Facebook",
  "Twitter",
  "YouTube",
  "Telegram",
  "TikTok",
  "LinkedIn",
  "VK",
  "Website",
  "Other",
] as const;

type SocialLink = { platform: string; url: string };

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

function ensureLinks(raw: unknown): SocialLink[] {
  if (Array.isArray(raw)) return raw as SocialLink[];
  return [];
}

export function SocialLinksForm({ payload, onChange }: Props) {
  const links = ensureLinks(payload.links);

  const update = (items: SocialLink[]) =>
    onChange({ ...payload, links: items });

  const setField = (i: number, field: keyof SocialLink, value: string) =>
    update(links.map((l, j) => (j === i ? { ...l, [field]: value } : l)));

  const addLink = () =>
    update([...links, { platform: "Instagram", url: "" }]);

  const removeLink = (i: number) =>
    update(links.filter((_, j) => j !== i));

  return (
    <div className="space-y-4">
      {links.map((link, i) => (
        <div key={i} className="card-flat p-3 grid gap-2 sm:grid-cols-[auto_1fr_auto] items-end">
          <div>
            <label className="label">Платформа</label>
            <select
              className="select"
              value={link.platform}
              onChange={(e) => setField(i, "platform", e.target.value)}
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">URL</label>
            <input
              className="input"
              type="url"
              value={link.url}
              onChange={(e) => setField(i, "url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <button
            type="button"
            className="btn btn-sm text-red-600 self-end"
            onClick={() => removeLink(i)}
          >
            Удалить
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-primary btn-sm" onClick={addLink}>
        + Добавить соцсеть
      </button>
    </div>
  );
}
