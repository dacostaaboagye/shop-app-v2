const isDevelopment = process.env.NODE_ENV !== "production";
const apiBaseUrlFromEnv = process.env.API_BASE_URL?.trim();

// Hard fail at build time when API_BASE_URL is missing in production. The
// rewrite below proxies every /api/* request to the configured API origin;
// without it, those requests stay at the Next.js origin (which has no API
// route handlers) and 404. The browser gets HTML, the frontend's
// problem-details parser returns null, and every authenticated flow surfaces
// as a misleading "Authentication failed" fallback.
if (!isDevelopment && !apiBaseUrlFromEnv) {
  throw new Error(
    "API_BASE_URL must be configured for production builds. Set it in the " +
      "Vercel/host environment to the public API origin (e.g. " +
      "https://shop-app-testing.fly.dev) so /api/* requests proxy correctly.",
  );
}

const configuredApiBaseUrl =
  apiBaseUrlFromEnv ?? (isDevelopment ? "http://localhost:4000" : "");

// Browser API calls go through the Next.js rewrite at the same origin, so
// `connect-src 'self'` is sufficient. `'unsafe-inline'` covers Next.js's
// runtime-emitted scripts/styles; tighten further with nonce middleware in a
// follow-up. `'unsafe-eval'` is needed in development for HMR/Turbopack only.
const scriptSrc = ["'self'", "'unsafe-inline'"];
if (isDevelopment) scriptSrc.push("'unsafe-eval'");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    // Production builds throw above when API_BASE_URL is missing; the only
    // way to reach this empty branch is `next dev` without the env var, in
    // which case the developer is intentionally running web-only without a
    // local API. Empty rewrites mean /api/* 404s — which is the right signal
    // that they need to start the API.
    if (!configuredApiBaseUrl) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${configuredApiBaseUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
  reactStrictMode: true,
  typedRoutes: true,
};

export default nextConfig;
