const configuredApiBaseUrl =
  process.env.API_BASE_URL?.trim() ||
  (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
