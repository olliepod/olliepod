import { NextRequest, NextResponse } from "next/server";
import { createReceiptUploadUrl } from "@/lib/r2";

// Protected by middleware.ts (password-gate session cookie) like every
// other route — this mints a short-lived presigned R2 PUT URL so the
// browser can upload a receipt photo/screenshot directly, without the
// file bytes passing through our server.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { fileName, contentType } = (body ?? {}) as Record<string, unknown>;
  if (typeof fileName !== "string" || typeof contentType !== "string") {
    return NextResponse.json({ error: "fileName and contentType are required." }, { status: 400 });
  }

  try {
    const { uploadUrl, key } = await createReceiptUploadUrl(fileName, contentType);
    return NextResponse.json({ uploadUrl, key });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create upload URL." },
      { status: 400 }
    );
  }
}
