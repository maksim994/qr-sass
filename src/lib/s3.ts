import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || "ru1";
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const publicUrl = process.env.S3_PUBLIC_URL || endpoint;
const omitBucketInUrl = process.env.S3_PUBLIC_OMIT_BUCKET === "true";
const prefix = process.env.S3_PREFIX || "qr";

function getClient() {
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY in .env");
  }
  return new S3Client({
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
