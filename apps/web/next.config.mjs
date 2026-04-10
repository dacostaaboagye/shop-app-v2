const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.API_BASE_URL?.trim() ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:4000" : "");

/** @type {import('next').NextConfig} */
const nextConfig = {
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
