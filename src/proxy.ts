import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Note: /api/uploads/presign (which mints B2 upload URLs) is intentionally
// NOT excluded here -- it must stay behind the password gate like
// everything else, since anyone who can reach it can write into the
// uploads bucket.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
