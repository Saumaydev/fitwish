import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the payment page itself.
  if (pathname === "/payment-pending") {
    return NextResponse.next();
  }

  // Allow Next.js internal assets.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons/")
  ) {
    return NextResponse.next();
  }

  // Temporarily block all other application access.
  return NextResponse.redirect(
    new URL("/payment-pending", request.url)
  );
}

export const config = {
  matcher: [
    /*
     * Run on all routes except Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};