"use client";

type LinkItem = { label: string; url: string };

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

function ensureLinks(raw: unknown): LinkItem[] {
  if (Array.isArray(raw)) return raw as LinkItem[];
  return [];
}

export function LinkListForm({ payload, onChange }: Props) {
  const links = ensureLinks(payload.links);

  const update = (items: LinkItem[]) =>
    onChange({ ...payload, links: items });

  const setField = (i: number, field: keyof LinkItem, value: string) =>
    update(links.map((l, j) => (j === i ? { ...l, [field]: value } : l)));

  const addLink = () => update([...links, { label: "", url: "" }]);

  const removeLink = (i: number) => update(links.filter((_, j) => j !== i));

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Заголовок</label>
        <input
          className="input"
          value={String(payload.title || "")}
          onChange={(e) => onChange({ ...payload, title: e.target.value })}
          placeholder="Заголовок списка ссылок"
        />
      </div>

      {links.map((link, i) => (
        <div key={i} className="card-flat p-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
          <div>
            <label className="label">Название</label>
            <input
              className="input"
              value={link.label}
              onChange={(e) => setField(i, "label", e.target.value)}
              placeholder="Текст ссылки"
            />
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
        + Добавить ссылку
      </button>
    </div>
  );
}
