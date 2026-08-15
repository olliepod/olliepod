import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Backblaze B2's S3-compatible endpoint is bucket-specific and copy-pasteable
// straight from the bucket's details page in the B2 console (looks like
// https://s3.us-west-004.backblazeb2.com) -- the region is embedded in it,
// so there's no separate B2_REGION to configure.
function regionFromEndpoint(endpoint: string): string {
  const match = endpoint.match(/^https?:\/\/s3\.([^.]+)\.backblazeb2\.com\/?$/);
  if (!match) {
    throw new Error("B2_ENDPOINT must look like https://s3.<region>.backblazeb2.com");
  }
  return match[1];
}

function getClient() {
  const endpoint = process.env.B2_ENDPOINT;
  const accessKeyId = process.env.B2_KEY_ID;
  const secretAccessKey = process.env.B2_APPLICATION_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("B2 is not configured — set B2_ENDPOINT, B2_KEY_ID, and B2_APPLICATION_KEY.");
  }

  return new S3Client({
    region: regionFromEndpoint(endpoint),
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

// Receipts/screenshots — haul receipt photos and Vinted itemized-order
// screenshots (Section 2 "Receipt tracking").
export async function createReceiptUploadUrl(fileName: string, contentType: string) {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error(`Unsupported file type: ${contentType}`);
  }

  const bucket = process.env.B2_BUCKET_NAME;
  if (!bucket) throw new Error("B2_BUCKET_NAME is not configured.");

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `receipts/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

  const client = getClient();
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 300 }
  );

  return { uploadUrl, key };
}

export function receiptPublicUrl(key: string): string | null {
  const base = process.env.B2_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key}`;
}
