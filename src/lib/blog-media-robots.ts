/** Explicit media permission in every existing agent group, including a custom robots.txt. */
export function allowBlogMediaRobots(content: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const result: string[] = [];
  let group = false, rules = false;
  const allow = () => { if (group) result.push("Allow: /media/"); };
  for (const line of lines) {
    if (/^\s*User-agent\s*:/i.test(line)) {
      if (rules) { allow(); rules = false; }
      group = true;
    } else if (group && /^\s*(?:Disallow|Allow|Crawl-delay)\s*:/i.test(line)) rules = true;
    // An explicit legacy media restriction must not override the new public media route.
    result.push(line.replace(/^(\s*)Disallow(\s*:\s*\/media(?:\/|\s|$))/i, "$1Allow$2"));
  }
  allow();
  if (!group) result.unshift("User-agent: *", "Allow: /media/");
  return result.join("\n");
}
