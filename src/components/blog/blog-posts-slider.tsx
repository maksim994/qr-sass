"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useCallback } from "react";

export type BlogPostCard = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string;
  views: number;
  likes: number;
  readingTimeMinutes: number | null;
};

type Props = {
  posts: BlogPostCard[];
};

const CARD_WIDTH = 340;
const GAP = 20;

export function BlogPostsSlider({ posts }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = (CARD_WIDTH + GAP) * 2; // scroll ~2 cards at a time
    el.scrollBy({
      left: direction === "prev" ? -step : step,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative mt-12 -mx-2 sm:-mx-4">
      {/* Gradient fade edges */}
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-12 bg-gradient-to-r from-slate-50 to-transparent sm:w-16" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-slate-50 to-transparent sm:w-16" />

      {/* Nav buttons - overlay on sides, hidden on small screens (swipe works) */}
      <button
        type="button"
        onClick={() => scroll("prev")}
        className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-slate-200/80 text-slate-600 backdrop-blur-sm transition hover:bg-white hover:text-slate-900 hover:shadow-xl active:scale-95"
        aria-label="Предыдущие статьи"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => scroll("next")}
        className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-slate-200/80 text-slate-600 backdrop-blur-sm transition hover:bg-white hover:text-slate-900 hover:shadow-xl active:scale-95"
        aria-label="Следующие статьи"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto overscroll-x-contain scroll-smooth px-4 py-3 sm:px-12 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {posts.map((post, index) => (
          <article
            key={post.slug}
            className="group w-[min(300px,78vw)] shrink-0 sm:w-[340px]"
            style={{ scrollSnapAlign: "start" }}
          >
            <Link
              href={`/blog/${post.slug}`}
              className="block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-xl hover:ring-slate-300/80 hover:-translate-y-1"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                {post.coverImageUrl ? (
                  <Image
                    src={post.coverImageUrl}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 78vw, 340px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority={index < 3}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-blue-600">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{post.excerpt}</p>
                )}
                <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                  <time dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString("ru", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  {post.readingTimeMinutes != null && (
                    <span>{post.readingTimeMinutes} мин</span>
                  )}
                  <span>{post.views} просмотров</span>
                  {post.likes > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <svg className="h-3.5 w-3.5 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                      </svg>
                      {post.likes}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
