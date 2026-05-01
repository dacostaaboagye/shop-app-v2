const configuredApiBaseUrl =
  process.env.API_BASE_URL?.trim() ||
  (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

const isDevelopment = process.env.NODE_ENV !== "production";

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
