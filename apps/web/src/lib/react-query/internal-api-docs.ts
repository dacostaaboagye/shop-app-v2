import { fetchJson } from "@/lib/react-query/fetch-json";

export type InternalApiSpec = {
  info: {
    description: string;
    title: string;
    version: string;
  };
  openapi: string;
  paths: Record<
    string,
    Record<
      string,
      {
        description?: string;
        parameters?: Array<{
          in: string;
          name: string;
          required?: boolean;
        }>;
        requestBody?: {
          content?: Record<string, { schema?: unknown }>;
        };
        responses?: Record<
          string,
          { content?: Record<string, { schema?: unknown }> }
        >;
        summary?: string;
        tags?: string[];
        "x-route-access"?: {
          kind: string;
          permission?: string;
          scope?: string;
        };
      }
    >
  >;
};

export const internalApiDocsQueryKey = ["internal", "api-docs"] as const;

export async function fetchInternalApiDocs(): Promise<InternalApiSpec> {
  return fetchJson<InternalApiSpec>(
    "/api/internal/docs/openapi.json",
    undefined,
    {
      auth: "required",
    },
  );
}
