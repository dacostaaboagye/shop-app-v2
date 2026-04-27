import { getWebEnv } from "@/env";

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (typeof window !== "undefined") {
    return path;
  }

  const configuredBaseUrl = getWebEnv().apiBaseUrl;

  if (!configuredBaseUrl) {
    return path;
  }

  return new URL(path, ensureTrailingSlash(configuredBaseUrl)).toString();
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
