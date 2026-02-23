"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Workspace = { id: string; name: string; plan: string };
type Props = {
  workspaces: Workspace[];
  currentId: string;
};

export function WorkspaceSwitcher({ workspaces, currentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (workspaces.length <= 1) {
    return (
      <div className="rounded-lg bg-blue-50 px-3 py-2">
        <p className="text-xs font-semibold text-blue-700">{workspaces[0]?.name ?? "—"}</p>
      </div>
    );
  }

  async function select(id: string) {
    if (id === currentId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workspaceId: id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg bg-blue-50 px-3 py-2">
      <label className="text-xs font-semibold text-blue-700">Рабочая область</label>
      <select
        value={currentId}
        onChange={(e) => select(e.target.value)}
        disabled={loading}
        className="mt-1 w-full truncate rounded border-0 bg-transparent text-xs font-medium text-blue-800 focus:ring-0"
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.plan})
          </option>
        ))}
      </select>
    </div>
  );
}
