export type ImageVariant = {
  url: string;
  key: string;
  width: number;
  height: number;
};
export function escapeImageAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
export function blogImageSrcset(variants: ImageVariant[]) {
  return variants.map((v) => `${v.url} ${v.width}w`).join(", ");
}
export function blogImageFigure(image: {
  url: string;
  alt: string;
  width: number;
  height: number;
  variants: ImageVariant[];
}) {
  return `<figure><img src="${escapeImageAttribute(image.url)}" alt="${escapeImageAttribute(image.alt)}" srcset="${escapeImageAttribute(blogImageSrcset(image.variants))}" sizes="(max-width: 960px) 100vw, 960px" width="${image.width}" height="${image.height}" loading="lazy"></figure>`;
}
