export type WebEnv = {
  apiBaseUrl?: string;
};

export function getWebEnv(): WebEnv {
  const apiBaseUrl =
    readStringEnv("API_BASE_URL") ?? readStringEnv("NEXT_PUBLIC_API_BASE_URL");

  return {
    ...(apiBaseUrl ? { apiBaseUrl } : {}),
  };
}

function readStringEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
