// Client-safe helper: gets a presigned R2 PUT URL from our API, then
// uploads the file directly to R2. Returns the object key to store on the
// Haul's receipts.
export async function uploadReceiptFile(file: File): Promise<string> {
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  });

  const presignBody = await presignRes.json();
  if (!presignRes.ok) {
    throw new Error(presignBody.error ?? "Failed to get an upload URL.");
  }

  const { uploadUrl, key } = presignBody as { uploadUrl: string; key: string };

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error("Upload to storage failed.");
  }

  return key;
}
