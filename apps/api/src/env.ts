type NodeEnv = "development" | "production" | "test";

export type ApiEnv = {
  apiHost: string;
  apiPort: number;
  authAccessTokenSecret?: string;
  authAccessTokenTtlSeconds: number;
  authCookieSecure: boolean;
  authRefreshTokenTtlSeconds: number;
  databaseUrl?: string;
  nodeEnv: NodeEnv;
  webBaseUrl?: string;
};

export function getApiEnv(): ApiEnv {
  const authAccessTokenSecret = readStringEnv("AUTH_ACCESS_TOKEN_SECRET");
  const databaseUrl = readStringEnv("DATABASE_URL");
  const nodeEnv = readNodeEnv();
  const configuredCookieSecurity = readBooleanEnv("AUTH_COOKIE_SECURE");
  const webBaseUrl = readStringEnv("WEB_BASE_URL");

  return {
    apiHost: readStringEnv("API_HOST") ?? "0.0.0.0",
    apiPort: readNumberEnv("API_PORT") ?? 4000,
    authAccessTokenTtlSeconds:
      readNumberEnv("AUTH_ACCESS_TOKEN_TTL_SECONDS") ?? 900,
    authRefreshTokenTtlSeconds:
      readNumberEnv("AUTH_REFRESH_TOKEN_TTL_SECONDS") ?? 604_800,
    authCookieSecure: configuredCookieSecurity ?? nodeEnv !== "development",
    ...(authAccessTokenSecret ? { authAccessTokenSecret } : {}),
    ...(databaseUrl ? { databaseUrl } : {}),
    nodeEnv,
    ...(webBaseUrl ? { webBaseUrl } : {}),
  };
}

function readNodeEnv(): NodeEnv {
  const value = readStringEnv("NODE_ENV");

  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
}

function readBooleanEnv(name: string): boolean | undefined {
  const value = readStringEnv(name)?.toLowerCase();

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function readNumberEnv(name: string): number | undefined {
  const value = readStringEnv(name);

  if (!value) {
    return undefined;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function readStringEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
