/** Считает время чтения: ~200 слов/мин для русского текста */
export function calculateReadingTimeMinutes(htmlContent: string): number {
  const text = htmlContent
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}
