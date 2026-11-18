import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic check only: the real session check happens in the admin layout (requireAdmin).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!request.cookies.get("session")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
