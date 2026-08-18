import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

/** Everything under these prefixes requires a session. */
const PROTECTED_PREFIXES = [
  "/today",
  "/jobs",
  "/profile",
  "/analytics",
  "/settings",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const signedIn = Boolean(req.auth?.user);

  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsAuth && !signedIn) {
    const url = new URL("/sign-in", req.nextUrl.origin);
    // Only ever a same-origin path, so this cannot become an open redirect.
    url.searchParams.set("next", pathname);
    return Response.redirect(url);
  }

  if (signedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return Response.redirect(new URL("/today", req.nextUrl.origin));
  }

  return undefined;
});

export const config = {
  matcher: [
    // Everything except Next internals, the auth API, and static files.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
