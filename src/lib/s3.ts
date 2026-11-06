import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { blogMediaKey } from "@/lib/blog-media-url";
import type { BlogMediaObject } from "@/lib/blog-media-http";
import { LocalMediaStorage, assertMediaKey, mediaContentType, type MediaStorage } from "@/lib/media-storage";
import { mediaConfig } from "@/lib/media-config";
import { localPublicMediaUrl } from "@/lib/public-media-url";
import { createHash } from "node:crypto";

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
  if (mediaConfig().MEDIA_STORAGE === "local") {
    // Private upload callers use the authenticated file/QR routes, never this URL.
    return localPublicMediaUrl(key) ?? "";
  }
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
  assertMediaKey(key);
  if (mediaConfig().MEDIA_STORAGE === "local" && access === "public" && !localPublicMediaUrl(key)) throw new Error("Invalid public media key");
  await storage().put(key, buffer, mimeType, access);
  return getPublicFileUrl(key);
}

const s3Storage: MediaStorage = {
  async put(key, buffer, mimeType, access) {
    await getClient().send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ...(access === "public" ? { ACL: "public-read" as const } : {}),
    }));
  },
  async get(key, head = false) {
    try {
      const args = { Bucket: bucket, Key: key }, options = { abortSignal: AbortSignal.timeout(15000) };
      const response = head
        ? await getClient().send(new HeadObjectCommand(args), options)
        : await getClient().send(new GetObjectCommand(args), options);
      if ((response.ContentLength ?? 0) > 10 * 1024 * 1024) throw new Error("Oversized media");
      const stream = "Body" in response ? response.Body as { transformToByteArray(): Promise<Uint8Array> } | undefined : undefined;
      const body = !head && stream ? Buffer.from(await stream.transformToByteArray()) : undefined;
      return { body, length: body?.length ?? response.ContentLength ?? 0, contentType: response.ContentType || "application/octet-stream", etag: response.ETag, lastModified: response.LastModified };
    } catch (error) {
      if (error && typeof error === "object" && (("name" in error && ["NoSuchKey", "NotFound"].includes(String(error.name))) || ("$metadata" in error && (error.$metadata as { httpStatusCode?: number })?.httpStatusCode === 404))) return null;
      throw error;
    }
  },
  async delete(key) {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};
let localStorage: LocalMediaStorage | undefined;
function storage(): MediaStorage {
  const config = mediaConfig();
  if (config.MEDIA_STORAGE === "s3") return s3Storage;
  if (!localStorage || localStorage.root !== config.MEDIA_ROOT) localStorage = new LocalMediaStorage(config.MEDIA_ROOT);
  return localStorage;
}

export async function getFileObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  assertMediaKey(key);
  const object = await storage().get(key);
  return object?.body ? { body: object.body, contentType: object.contentType } : null;
}
export async function deleteFile(key: string) {
  assertMediaKey(key);
  await storage().delete(key);
}

/** Fixed public editorial prefix. No network access in the default local mode. */
export async function getBlogMediaObject(key: string, head = false): Promise<BlogMediaObject | null> {
  if (!key.startsWith("qr/blog/") || blogMediaKey(key.slice(8).split("/")) !== key) return null;
  const backend = storage(), object = await backend.get(key, head);
  if (object || mediaConfig().MEDIA_STORAGE !== "local") return object ? { ...object, contentType: mediaContentType(key) } : null;
  // Old same-origin image addresses remain usable after importing hashed copies.
  const hash = createHash("md5").update(`https://s3.mvmolkov.ru/${key}`).digest("hex").slice(0, 10);
  return backend.get(`qr/blog/content/${hash}.webp`, head);
}

export async function getPublicAssetObject(key: string, head = false) {
  if (!localPublicMediaUrl(key)) return null;
  const object = await storage().get(key, head);
  return object ? { ...object, contentType: mediaContentType(key) } : null;
}
