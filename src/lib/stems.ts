import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import archiver from "archiver";
import { PassThrough } from "stream";

/**
 * Stems zipper (Blueprint §13 — Vector 3 raw asset extraction).
 *
 * After the Remotion render completes, this function:
 *   1. Fetches every block's imageUrl (the Brutalist Sovereign style-wrapped images).
 *   2. Streams them into a ZIP archive using `archiver`.
 *   3. Uploads the ZIP to S3 at `modules/<moduleId>/stems.zip`.
 *   4. Returns a signed GET URL (1-hour TTL) for the Port export panel.
 *
 * This is called as a post-render step inside the render worker, not during
 * the main Remotion compile — it runs after the MP4 is confirmed complete.
 */

const s3     = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
const BUCKET = process.env.S3_BUCKET ?? "content-storm-assets";

interface BlockAsset {
  order:        number;
  sectionTitle: string;
  imageUrl:     string | null;
}

/**
 * Fetches each imageUrl, zips with a clean filename, uploads to S3.
 * Returns the S3 key of the resulting ZIP.
 */
export async function buildStemsZip(
  moduleId: string,
  blocks:   BlockAsset[]
): Promise<string> {
  const blocksWithImages = blocks.filter((b) => b.imageUrl !== null);
  if (blocksWithImages.length === 0) {
    throw new Error(`No images to zip for module ${moduleId}`);
  }

  const zipKey = `modules/${moduleId}/stems.zip`;

  // Create an archiver stream and pipe it to a PassThrough,
  // which S3 SDK reads as a Body.
  const pass    = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(pass);

  // Fetch all images concurrently, append to archive.
  await Promise.all(
    blocksWithImages.map(async (block) => {
      const res = await fetch(block.imageUrl!);
      if (!res.ok) {
        console.warn(`[stems] fetch failed for block ${block.order}: ${res.status}`);
        return;
      }
      const arrayBuf = await res.arrayBuffer();
      const buf      = Buffer.from(arrayBuf);
      const ext      = block.imageUrl!.split("?")[0].split(".").pop() ?? "jpg";
      const filename = `${String(block.order).padStart(2, "0")}-${block.sectionTitle
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 48)}.${ext}`;

      archive.append(buf, { name: filename });
    })
  );

  // Finalize archive and collect the buffer from the PassThrough.
  archive.finalize();
  const chunks: Buffer[] = [];
  for await (const chunk of pass) chunks.push(chunk as Buffer);
  const zipBuffer = Buffer.concat(chunks);

  // Upload to S3.
  await s3.send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         zipKey,
      Body:        zipBuffer,
      ContentType: "application/zip",
    })
  );

  return zipKey;
}

/** Generate a signed GET URL for an S3 key (1-hour TTL). */
export async function signedGetUrl(key: string, ttlSeconds = 3600): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: ttlSeconds }
  );
}
