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

export async function optimizeBlogImageVariants(buffer:Buffer) {
  const meta=await sharp(buffer,{limitInputPixels:40_000_000,animated:false}).metadata();
  const rotated=[5,6,7,8].includes(meta.orientation??0);
  const width=(rotated?meta.height:meta.width)??0;
  if(!width)throw new Error("Invalid image dimensions");
  const widths=[...new Set([480,960,1600].map(w=>Math.min(w,width)))].sort((a,b)=>a-b);
  return Promise.all(widths.map(async width=>{
    const {data,info}=await sharp(buffer,{limitInputPixels:40_000_000,animated:false}).rotate().resize({width,withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});
    return {buffer:data,width:info.width,height:info.height};
  }));
}
