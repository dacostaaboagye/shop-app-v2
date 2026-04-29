"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Lock } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildLoginRedirectHref } from "@/lib/auth/auth-redirect";
import {
  fetchInternalApiDocs,
  internalApiDocsQueryKey,
} from "@/lib/react-query/internal-api-docs";
import { toRoute } from "@/lib/routes";
import {
  isAuthSessionPending,
  useAuthSessionStore,
} from "@/store/use-auth-session-store";

declare global {
  interface Window {
    SwaggerUIBundle?: ((config: Record<string, unknown>) => {
      destroy?: () => void;
    }) & {
      presets?: {
        apis?: unknown;
      };
    };
  }
}

export function InternalApiDocsPageClient() {
  const status = useAuthSessionStore((state) => state.status);
  const { can } = useAuthorization();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const swaggerInstanceRef = useRef<{ destroy?: () => void } | null>(null);
  const isDevelopment = process.env.NODE_ENV === "development";
  const isAuthenticated = status === "authenticated";
  const canViewDocs =
    isAuthenticated && (isDevelopment || can("api.docs.view"));
  const [bundleLoaded, setBundleLoaded] = useState(false);
  const docsQuery = useQuery({
    enabled: canViewDocs,
    queryFn: fetchInternalApiDocs,
    queryKey: internalApiDocsQueryKey,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (
      !bundleLoaded ||
      !docsQuery.data ||
      !hostRef.current ||
      !window.SwaggerUIBundle
    ) {
      return;
    }

    swaggerInstanceRef.current?.destroy?.();
    hostRef.current.innerHTML = "";
    swaggerInstanceRef.current = window.SwaggerUIBundle({
      deepLinking: true,
      defaultModelsExpandDepth: -1,
      displayRequestDuration: true,
      docExpansion: "list",
      domNode: hostRef.current,
      presets: window.SwaggerUIBundle.presets?.apis
        ? [window.SwaggerUIBundle.presets.apis]
        : undefined,
      spec: docsQuery.data,
    });

    return () => {
      swaggerInstanceRef.current?.destroy?.();
      swaggerInstanceRef.current = null;

      if (hostRef.current) {
        hostRef.current.innerHTML = "";
      }
    };
  }, [bundleLoaded, docsQuery.data]);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <Script
        onLoad={() => setBundleLoaded(true)}
        src="/docs/api/assets/swagger-ui-bundle"
        strategy="afterInteractive"
      />
      {isAuthSessionPending(status) ? (
        <div className="mx-auto flex min-h-svh max-w-7xl items-center justify-center px-6 py-10">
          <Skeleton className="h-[70vh] w-full rounded-xl" />
        </div>
      ) : status === "anonymous" ? (
        <div className="mx-auto flex min-h-svh max-w-5xl items-center justify-center px-6 py-10">
          <AppEmptyState
            action={
              <Link
                className={buttonVariants({ size: "sm" })}
                href={toRoute(buildLoginRedirectHref("/docs/api"))}
              >
                Sign in to view docs
              </Link>
            }
            description="Sign in with a local or development account to open the protected Swagger reference."
            icon={Lock}
            title="Authentication required"
          />
        </div>
      ) : !canViewDocs ? (
        <div className="mx-auto flex min-h-svh max-w-5xl items-center justify-center px-6 py-10">
          <AppEmptyState
            description="This account does not currently have the internal API documentation grant for this environment."
            icon={Lock}
            title="Docs access required"
          />
        </div>
      ) : docsQuery.isPending || !bundleLoaded ? (
        <div className="mx-auto flex min-h-svh max-w-7xl items-center justify-center px-6 py-10">
          <Skeleton className="h-[70vh] w-full rounded-xl" />
        </div>
      ) : docsQuery.isError ? (
        <div className="mx-auto max-w-5xl px-6 py-10">
          <AppErrorBanner
            detail="Could not load the protected Swagger reference."
            error={docsQuery.error}
            onRetry={() => void docsQuery.refetch()}
            title="Unable to load Swagger docs"
          />
        </div>
      ) : docsQuery.data ? (
        <div className="min-h-svh">
          <div className="border-b border-border bg-muted/50 px-6 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-lg font-semibold leading-tight text-foreground">
                  {docsQuery.data.info.title}
                </h1>
                <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                  {docsQuery.data.info.description}
                </p>
              </div>
              <Button
                onClick={() => void downloadSpec(docsQuery.data)}
                size="sm"
                variant="outline"
              >
                <Download />
                Download OpenAPI JSON
              </Button>
            </div>
          </div>
          <div className="swagger-host min-h-[calc(100svh-5rem)] bg-background">
            <div ref={hostRef} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function downloadSpec(spec: unknown) {
  const blob = new Blob([JSON.stringify(spec, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "shop-api-internal-openapi.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
