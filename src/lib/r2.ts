import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getClient() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
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

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not configured.");

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
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key}`;
}
