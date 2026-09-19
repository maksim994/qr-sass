"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";

const script = `
(function() {
  try {
    var t = localStorage.getItem('qrs-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.style.colorScheme = t;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {}
})();
`;
export function ThemeScript() {
  const inserted = useRef(false);

  // Keep the parser-executed bootstrap in the server head, outside client rendering.
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script id="qrs-theme-init" dangerouslySetInnerHTML={{ __html: script }} />;
  });

  return null;
}
