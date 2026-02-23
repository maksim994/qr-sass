"use client";

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
      const res = await fetch(`/api/blog/${slug}/like`, { method: "POST" });
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-4 font-semibold text-slate-900">Была ли полезна вам статья?</p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleVote}
          disabled={alreadyVoted || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          {alreadyVoted ? "Спасибо!" : "Да, полезна"}
        </button>
        <span className="text-sm text-slate-500">
          {likes} {likes === 1 ? "лайк" : likes < 5 ? "лайка" : "лайков"}
        </span>
      </div>
    </div>
  );
}
