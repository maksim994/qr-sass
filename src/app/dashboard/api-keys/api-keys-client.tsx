"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type KeyItem = { id: string; name: string; prefix: string; createdAt: string };

type Props = { workspaceId: string };

export function ApiKeysClient({ workspaceId }: Props) {
  const router = useRouter();
  const [keys, setKeys] = useState<KeyItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.data?.items) setKeys(data.data.items);
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert((data as { error?: string })?.error ?? "Ошибка");
        return;
      }
      if (data.ok && data.data?.key) {
        setNewKey(data.data.key);
        setName("");
        loadKeys();
      }
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(keyId: string) {
    if (!confirm("Отозвать ключ? Он перестанет работать.")) return;
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return;
      setKeys((k) => (k ?? []).filter((x) => x.id !== keyId));
    } finally {
      setRevoking(null);
    }
  }

  useEffect(() => {
    loadKeys();
  }, [workspaceId]);

  return (
    <div className="space-y-6">
      {newKey && (
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">Ключ создан. Скопируйте его — он больше не будет показан.</p>
          <code className="mt-2 block break-all rounded bg-amber-100 px-2 py-2 text-sm font-mono text-amber-900">
            {newKey}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newKey);
              setNewKey(null);
            }}
            className="btn btn-sm mt-3"
          >
            Скопировать и закрыть
          </button>
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Создать ключ</h2>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Название (напр. Production)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input flex-1"
          />
          <button onClick={createKey} disabled={creating} className="btn btn-primary">
            {creating ? "…" : "Создать"}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">Мои ключи</h2>
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Загрузка…</p>
        ) : !keys?.length ? (
          <p className="p-5 text-sm text-slate-500">Нет ключей. Создайте первый выше.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-semibold text-slate-900">Название</th>
                <th className="px-5 py-3 font-semibold text-slate-900">Префикс</th>
                <th className="px-5 py-3 font-semibold text-slate-900" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-900">{k.name}</td>
                  <td className="px-5 py-3 font-mono text-slate-600">{k.prefix}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => revokeKey(k.id)}
                      disabled={revoking === k.id}
                      className="text-sm text-amber-600 hover:text-amber-700 disabled:opacity-50"
                    >
                      {revoking === k.id ? "…" : "Отозвать"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-sm text-slate-500">
        <Link href="/dashboard/api-docs" className="font-medium text-blue-600 hover:text-blue-700">
          Документация API →
        </Link>
      </p>
    </div>
  );
}
