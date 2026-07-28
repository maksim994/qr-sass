"use client";
import { fetchApi } from "@/lib/client-api";

import { useEffect, useState } from "react";

type Props = { slug: string; initialLikes: number };

export function ArticleUsefulBlock({ slug, initialLikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const votedList = JSON.parse(sessionStorage.getItem("blog-voted") || "[]");
      if (votedList.includes(slug)) setVoted(true);
    } catch {
      // ignore
    }
  }, [slug, mounted]);

  const handleVote = async () => {
    if (voted || loading) return;
    setLoading(true);
    try {
      const res = await fetchApi(`/api/blog/${slug}/like`, { method: "POST" });
      if (res.ok) {
        const { likes: newLikes } = await res.json();
        setLikes(newLikes);
        setVoted(true);
        try {
          const votedList = JSON.parse(sessionStorage.getItem("blog-voted") || "[]");
          if (!votedList.includes(slug)) {
            votedList.push(slug);
            sessionStorage.setItem("blog-voted", JSON.stringify(votedList));
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const alreadyVoted = voted;

  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid var(--border-default)",
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-sm)",
        padding: "24px",
      }}
    >
      <p style={{ marginBottom: "16px", font: "var(--fw-bold) 1rem/1.3 var(--font-display)", color: "var(--text-strong)" }}>
        Была ли полезна вам статья?
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleVote}
          disabled={alreadyVoted || loading}
          className="fk-button fk-button--secondary fk-button--sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          {alreadyVoted ? "Спасибо!" : "Да, полезна"}
        </button>
        <span style={{ font: "var(--fw-medium) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-muted)" }}>
          {likes} {likes === 1 ? "лайк" : likes < 5 ? "лайка" : "лайков"}
        </span>
      </div>
    </div>
  );
}
