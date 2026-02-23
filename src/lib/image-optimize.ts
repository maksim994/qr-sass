import sharp from "sharp";

const MAX_SIDE = 3000;
const QUALITY = 85;

/** Оптимизирует изображение: ресайз если > MAX_SIDE, конверт в WebP */
export async function optimizeImageForBlog(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const { width = 0, height = 0 } = meta;
  const needsResize = width > MAX_SIDE || height > MAX_SIDE;

  let pipeline = image;
  if (needsResize) {
    pipeline = pipeline.resize(MAX_SIDE, MAX_SIDE, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  return pipeline
    .webp({ quality: QUALITY })
    .toBuffer();
}
