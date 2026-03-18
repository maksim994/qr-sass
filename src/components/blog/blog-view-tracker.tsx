"use client";
import { fetchApi } from "@/lib/client-api";


import { useEffect } from "react";

type Props = { slug: string };

export function BlogViewTracker({ slug }: Props) {
  useEffect(() => {
    fetchApi(`/api/blog/${slug}/view`, { method: "POST", credentials: "include" }).catch(
      () => {}
    );
  }, [slug]);

  return null;
}
