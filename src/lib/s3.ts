import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
): Promise<string> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    }),
  );
  return getPublicFileUrl(key);
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
