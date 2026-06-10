import { Auth0Client } from "@auth0/nextjs-auth0/server";

let _client: Auth0Client | null = null;

/**
 * Lazy Auth0 v4 client (same pattern as getPrisma — env vars are missing at
 * build time in the Docker standalone build).
 *
 * Maps the v3 env var names still used in deployments, so upgrading the SDK
 * requires no EasyPanel env changes:
 *   AUTH0_ISSUER_BASE_URL → domain, AUTH0_BASE_URL → appBaseUrl
 * The v3 route paths (/api/auth/login|logout|callback) are kept so UI links
 * and the Auth0 tenant callback URL stay valid.
 */
export function getAuth0(): Auth0Client {
  if (_client) return _client;

  const domain =
    process.env.AUTH0_DOMAIN ??
    process.env.AUTH0_ISSUER_BASE_URL?.replace(/^https?:\/\//, "");
  const appBaseUrl = process.env.APP_BASE_URL ?? process.env.AUTH0_BASE_URL;

  _client = new Auth0Client({
    domain,
    appBaseUrl,
    routes: {
      login: "/api/auth/login",
      logout: "/api/auth/logout",
      callback: "/api/auth/callback",
    },
  });
  return _client;
}

export async function getSession() {
  return getAuth0().getSession();
}
