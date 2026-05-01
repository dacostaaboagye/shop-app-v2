const isDevelopment = process.env.NODE_ENV !== "production";
const apiBaseUrlFromEnv = process.env.API_BASE_URL?.trim();

// Vercel sets VERCEL=1 automatically for *every* build that will be deployed
// — Production, Preview, and Development environments alike. CI verify-only
// builds (GitHub Actions running `pnpm build`) do not set it. We only need
// to fail-fast for actual deploys; CI just compiles artifacts that never
// ship.
const isVercelDeploy = process.env.VERCEL === "1";

// Hard fail at deploy time when API_BASE_URL is missing. Without the rewrite
// below, every /api/* request stays at the Next.js origin (no API route
// handlers), Next returns its 404 HTML, the frontend's problem-details
// parser returns null, and every authenticated flow surfaces as a misleading
// "Authentication failed" fallback.
if (isVercelDeploy && !apiBaseUrlFromEnv) {
  throw new Error(
    "API_BASE_URL must be configured for Vercel deploys. Set it in the " +
      "project's Environment Variables to the public API origin (e.g. " +
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
