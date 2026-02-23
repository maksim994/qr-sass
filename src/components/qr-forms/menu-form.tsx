"use client";

type MenuItem = { name: string; description: string; price: string };
type Category = { name: string; items: MenuItem[] };

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

function ensureCategories(raw: unknown): Category[] {
  if (Array.isArray(raw)) return raw as Category[];
  return [];
}

export function MenuForm({ payload, onChange }: Props) {
  const categories = ensureCategories(payload.categories);

  const update = (cats: Category[]) =>
    onChange({ ...payload, categories: cats });

  const addCategory = () =>
    update([...categories, { name: "", items: [{ name: "", description: "", price: "" }] }]);

  const removeCategory = (ci: number) =>
    update(categories.filter((_, i) => i !== ci));

  const setCategoryName = (ci: number, name: string) =>
    update(categories.map((c, i) => (i === ci ? { ...c, name } : c)));

  const addItem = (ci: number) =>
    update(
      categories.map((c, i) =>
        i === ci ? { ...c, items: [...c.items, { name: "", description: "", price: "" }] } : c,
      ),
    );

  const removeItem = (ci: number, ii: number) =>
    update(
      categories.map((c, i) =>
        i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c,
      ),
    );

  const setItemField = (ci: number, ii: number, field: keyof MenuItem, value: string) =>
    update(
      categories.map((c, i) =>
        i === ci
          ? { ...c, items: c.items.map((it, j) => (j === ii ? { ...it, [field]: value } : it)) }
          : c,
      ),
    );

  return (
    <div className="space-y-4">
      {categories.map((cat, ci) => (
        <div key={ci} className="card-flat p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              value={cat.name}
              onChange={(e) => setCategoryName(ci, e.target.value)}
              placeholder="Название категории"
            />
            <button
              type="button"
              className="btn btn-sm text-red-600"
              onClick={() => removeCategory(ci)}
            >
              Удалить
            </button>
          </div>

          {cat.items.map((item, ii) => (
            <div key={ii} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] items-end">
              <div>
                <label className="label">Название</label>
                <input
                  className="input"
                  value={item.name}
                  onChange={(e) => setItemField(ci, ii, "name", e.target.value)}
                  placeholder="Блюдо"
                />
              </div>
              <div>
                <label className="label">Описание</label>
                <input
                  className="input"
                  value={item.description}
                  onChange={(e) => setItemField(ci, ii, "description", e.target.value)}
                  placeholder="Описание"
                />
              </div>
              <div>
                <label className="label">Цена</label>
                <input
                  className="input"
                  value={item.price}
                  onChange={(e) => setItemField(ci, ii, "price", e.target.value)}
                  placeholder="500"
                />
              </div>
              <button
                type="button"
                className="btn btn-sm text-red-600 self-end"
                onClick={() => removeItem(ci, ii)}
              >
                X
              </button>
            </div>
          ))}

          <button type="button" className="btn btn-sm" onClick={() => addItem(ci)}>
            + Добавить позицию
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-primary btn-sm" onClick={addCategory}>
        + Добавить категорию
      </button>
    </div>
  );
}
