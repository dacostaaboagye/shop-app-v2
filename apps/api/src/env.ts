type NodeEnv = "development" | "production" | "test";

export type ApiEnv = {
  apiHost: string;
  apiPort: number;
  authAccessTokenSecret?: string;
  authAccessTokenTtlSeconds: number;
  authCookieSecure: boolean;
  authRefreshTokenTtlSeconds: number;
  databaseUrl?: string;
  emailFromAddress: string;
  googleCallbackUrl?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  nodeEnv: NodeEnv;
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2Bucket?: string;
  r2PublicUrl?: string;
  r2SecretAccessKey?: string;
  resendApiKey?: string;
  webBaseUrl?: string;
};

export function getApiEnv(): ApiEnv {
  const authAccessTokenSecret = readStringEnv("AUTH_ACCESS_TOKEN_SECRET");
  const databaseUrl = readStringEnv("DATABASE_URL");
  const nodeEnv = readNodeEnv();
  const configuredCookieSecurity = readBooleanEnv("AUTH_COOKIE_SECURE");
  const webBaseUrl = readStringEnv("WEB_BASE_URL");
  const r2AccountId = readStringEnv("R2_ACCOUNT_ID");
  const r2AccessKeyId = readStringEnv("R2_ACCESS_KEY_ID");
  const r2SecretAccessKey = readStringEnv("R2_SECRET_ACCESS_KEY");
  const r2Bucket = readStringEnv("R2_BUCKET");
  const r2PublicUrl = readStringEnv("R2_PUBLIC_URL");
  const googleClientId = readStringEnv("GOOGLE_CLIENT_ID");
  const googleClientSecret = readStringEnv("GOOGLE_CLIENT_SECRET");
  const googleCallbackUrl = readStringEnv("GOOGLE_CALLBACK_URL");
  const resendApiKey = readStringEnv("RESEND_API_KEY");

  return {
    apiHost: readStringEnv("API_HOST") ?? "0.0.0.0",
    apiPort: readNumberEnv("API_PORT") ?? 4000,
    authAccessTokenTtlSeconds:
      readNumberEnv("AUTH_ACCESS_TOKEN_TTL_SECONDS") ?? 900,
    authRefreshTokenTtlSeconds:
      readNumberEnv("AUTH_REFRESH_TOKEN_TTL_SECONDS") ?? 604_800,
    authCookieSecure: configuredCookieSecurity ?? nodeEnv !== "development",
    emailFromAddress:
      readStringEnv("EMAIL_FROM_ADDRESS") ?? "noreply@shopapp.com",
    ...(authAccessTokenSecret ? { authAccessTokenSecret } : {}),
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(googleClientId ? { googleClientId } : {}),
    ...(googleClientSecret ? { googleClientSecret } : {}),
    ...(googleCallbackUrl ? { googleCallbackUrl } : {}),
    nodeEnv,
    ...(r2AccountId ? { r2AccountId } : {}),
    ...(r2AccessKeyId ? { r2AccessKeyId } : {}),
    ...(r2SecretAccessKey ? { r2SecretAccessKey } : {}),
    ...(r2Bucket ? { r2Bucket } : {}),
    ...(r2PublicUrl ? { r2PublicUrl } : {}),
    ...(resendApiKey ? { resendApiKey } : {}),
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
