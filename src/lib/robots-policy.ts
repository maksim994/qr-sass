/** Keep configured rules, but never blanket-block public files under /api/. */
export function applyPublicRobotsPolicy(content: string): string {
  const sitemaps: string[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n").flatMap(line => {
    if (/^\s*Sitemap\s*:/i.test(line)) { sitemaps.push(line.trim()); return []; }
    if (/^\s*Clean-param\s*:\s*static&next&plan\s*$/i.test(line)) return [];
    if (/^\s*Allow\s*:\s*\/media\/\s*$/i.test(line)) return []; // reinsert once per group below
    if (/^\s*Disallow\s*:\s*\/api\/?\s*$/i.test(line)) return ["Disallow: /api/auth/"];
    return [line.replace(/^(\s*Disallow\s*:\s*\/(?:dashboard|admin))\/\s*$/i, "$1")];
  });
  // A separate * group is avoided: crawlers may choose only one equally specific group.
  let inWildcard = false, inserted = false;
  const output: string[] = [];
  function add() {
    if (inWildcard && !inserted) {
      output.push("Allow: /media/", "Disallow: /api/auth/", "Clean-param: static&next&plan"); inserted = true;
    }
  }
  for (const line of lines) {
    if (/^\s*User-agent\s*:/i.test(line)) {
      add();
      inWildcard = /^\s*User-agent\s*:\s*\*\s*$/i.test(line); inserted = false;
    }
    output.push(line);
  }
  add();
  if (!lines.some(line => /^\s*User-agent\s*:\s*\*\s*$/i.test(line))) output.unshift("User-agent: *", "Allow: /", "Allow: /media/", "Disallow: /api/auth/", "Clean-param: static&next&plan", "");
  // Remove duplicate rules within each group and put Sitemap last.
  const seen = new Set<string>();
  const result = output.filter(line => {
    if (/^\s*User-agent\s*:/i.test(line)) seen.clear();
    if (!line.trim()) return false;
    const key = line.trim(); if (seen.has(key)) return false; seen.add(key); return true;
  }).join("\n").trim();
  return `${result}\n\n${[...new Set(sitemaps)].join("\n")}\n`;
}
