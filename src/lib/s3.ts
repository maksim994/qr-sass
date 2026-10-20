import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { blogMediaKey } from "@/lib/blog-media-url";
import type { BlogMediaObject } from "@/lib/blog-media-http";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || "ru1";
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const publicUrl = process.env.S3_PUBLIC_URL || endpoint;
const omitBucketInUrl = process.env.S3_PUBLIC_OMIT_BUCKET === "true";
const prefix = process.env.S3_PREFIX || "qr";
let client: S3Client | undefined;

function getClient() {
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY in .env");
  }
  return client ??= new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

export function getS3Key(workspaceId: string, fileId: string, ext: string) {
  return `${prefix}/${workspaceId}/${fileId}.${ext}`;
}

export function getBlogCoverKey(fileId: string) {
  return `${prefix}/blog/covers/${fileId}.webp`;
}

export function getBlogContentImageKey(fileId: string) {
  return `${prefix}/blog/content/${fileId}.webp`;
}

export function getFaviconKey(fileId: string, ext: string) {
  return `${prefix}/site/favicon_${fileId}.${ext}`;
}

export function getAvatarKey(userId: string, fileId: string, ext: string) {
  return `${prefix}/avatars/${userId}/${fileId}.${ext}`;
}

export function getPublicFileUrl(key: string) {
  if (omitBucketInUrl) {
    return `${publicUrl}/${key}`;
  }
  return `${publicUrl}/${bucket}/${key}`;
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string,
  access: "private" | "public" = "private",
): Promise<string> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ...(access === "public" ? { ACL: "public-read" as const } : {}),
    }),
  );
  return getPublicFileUrl(key);
}

export async function getFileObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  const client = getClient();
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) return null;
    return { body: Buffer.from(bytes), contentType: response.ContentType || "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function deleteFile(key: string) {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

/** Fixed public blog prefix only; all other S3 access remains private/unchanged. */
export async function getBlogMediaObject(key: string, head = false): Promise<BlogMediaObject | null> {
  if (!key.startsWith("qr/blog/") || blogMediaKey(key.slice(8).split("/")) !== key) return null;
  const types: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif" };
  try {
    const command = head ? new HeadObjectCommand({ Bucket: bucket, Key: key }) : new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await getClient().send(command, { abortSignal: AbortSignal.timeout(15000) });
    if ((response.ContentLength ?? 0) > 10 * 1024 * 1024) throw new Error("Oversized blog media");
    const body = !head && "Body" in response ? Buffer.from(await response.Body!.transformToByteArray()) : undefined;
    return { body, contentType: types[key.split(".").at(-1)!.toLowerCase()], length: body?.length ?? response.ContentLength ?? 0, etag: response.ETag, lastModified: response.LastModified };
  } catch (error) {
    if (error && typeof error === "object" && (("name" in error && ["NoSuchKey", "NotFound"].includes(String(error.name))) || ("$metadata" in error && (error.$metadata as { httpStatusCode?: number })?.httpStatusCode === 404))) return null;
    throw error;
  }
}
