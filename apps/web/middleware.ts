import type { NextRequest } from "next/server";
import { getAuth0 } from "./lib/auth0";

// Auth0 v4 mounts its auth routes (login/logout/callback, kept at the v3
// /api/auth/* paths via routes config in lib/auth0.ts) through middleware.
export async function middleware(request: NextRequest) {
  return getAuth0().middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
