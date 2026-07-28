"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/client-api";
import { Alert } from "@/components/ui";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";

export function ApiKeysUpgradeBanner() {
  return (
    <Alert
      variant="warning"
      size="sm"
      title="Требуется тариф Бизнес"
      className="qrs-apikeys-card qrs-apikeys-upgrade"
      action={
        <Link href="/dashboard/billing" className="fk-button fk-button--primary fk-button--sm">
          Перейти на Бизнес
        </Link>
      }
    >
      API-доступ доступен на тарифе <strong>Бизнес</strong>.
    </Alert>
  );
}

export function ApiKeysPermissionBanner() {
  return (
    <Alert variant="info" size="sm" title="Недостаточно прав" className="qrs-apikeys-card qrs-apikeys-upgrade">
      Только владелец или администратор рабочей области могут создавать API-ключи.
    </Alert>
  );
}

type KeyItem = { id: string; name: string; prefix: string; createdAt: string };

export function ApiKeysWorkspaceBar({ workspaceId }: { workspaceId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(workspaceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="qrs-apikeys-workspace">
      <span style={{ font: "var(--fw-semibold) 14px/1 var(--font-sans)", color: "var(--text-default)" }}>
        Workspace ID для API:
      </span>
      <code className="qrs-apikeys-workspace-id">{workspaceId}</code>
      <button type="button" className="qrs-copy" aria-label="Скопировать" onClick={copyId}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="14" height="14" x="8" y="8" rx="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        {copied ? "Скопировано" : "Копировать"}
      </button>
    </div>
  );
}

type Props = { workspaceId: string };

export function ApiKeysClient({ workspaceId }: Props) {
  const [keys, setKeys] = useState<KeyItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetchApi(`/api/workspaces/${workspaceId}/api-keys`, { credentials: "include" });
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
      const res = await fetchApi(`/api/workspaces/${workspaceId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string })?.error ?? "Ошибка создания ключа");
        return;
      }
      if (data.ok && data.data?.key) {
        trackGoal(PRODUCT_GOALS.api_key_created);
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
      const res = await fetchApi(`/api/workspaces/${workspaceId}/api-keys/${keyId}`, {
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
    <div style={{ marginTop: "20px" }}>
      {error && (
        <Alert variant="danger" title="Ошибка" onClose={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}

      {newKey && (
        <Alert variant="success" title="Ключ создан" className="qrs-apikeys-new-key mb-4">
          Скопируйте ключ — он больше не будет показан.
          <code className="qrs-apikeys-workspace-id" style={{ display: "block", marginTop: "10px", wordBreak: "break-all" }}>
            {newKey}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(newKey);
              setNewKey(null);
            }}
            className="fk-button fk-button--secondary fk-button--sm"
            style={{ marginTop: "12px" }}
          >
            Скопировать и закрыть
          </button>
        </Alert>
      )}

      <div className="qrs-apikeys-card qrs-apikeys-section">
        <div className="qrs-apikeys-section-title">Создать ключ</div>
        <div className="qrs-invite-row" style={{ display: "flex", gap: "12px" }}>
          <input
            type="text"
            placeholder="Название (напр. Production)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="qrs-apikeys-input"
          />
          <button type="button" onClick={createKey} disabled={creating} className="fk-button fk-button--primary">
            {creating ? "…" : "Создать"}
          </button>
        </div>
      </div>

      <div className="qrs-apikeys-card qrs-apikeys-table-wrap">
        <div className="qrs-apikeys-table-head">Мои ключи</div>
        {loading ? (
          <Alert variant="info">Загрузка ключей…</Alert>
        ) : !keys?.length ? (
          <Alert variant="info" title="Нет ключей">
            Создайте первый ключ выше.
          </Alert>
        ) : (
          <div className="qrs-scroll" style={{ overflowX: "auto" }}>
            <table className="qrs-apikeys-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Префикс</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td>
                      <code className="qrs-apikeys-prefix">{k.prefix}</code>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => revokeKey(k.id)}
                        disabled={revoking === k.id}
                        className="qrs-apikeys-revoke"
                      >
                        {revoking === k.id ? "…" : "Отозвать"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link href="/dashboard/api-docs" className="qrs-apikeys-docs qrs-navlink">
        Документация API
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
