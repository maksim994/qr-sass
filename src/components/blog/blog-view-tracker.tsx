"use client";

import { useEffect } from "react";

type Props = { slug: string };

export function BlogViewTracker({ slug }: Props) {
  useEffect(() => {
    fetch(`/api/blog/${slug}/view`, { method: "POST", credentials: "include" }).catch(
      () => {}
    );
  }, [slug]);

  return null;
}
