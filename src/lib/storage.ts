import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Object storage (Blueprint §3). The Vault uses presigned PUTs so large files
 * upload straight from the browser to S3 — the Next.js route never proxies
 * file bytes. The ingest worker then fetches the object by key.
 */

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
const BUCKET = process.env.S3_BUCKET ?? "content-storm-assets";

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`Empty object body for key ${key}`);
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function createPresignedUpload(
  key: string,
  contentType: string,
  expiresInSeconds = 900
): Promise<{ url: string; key: string }> {
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: expiresInSeconds }
  );
  return { url, key };
}
