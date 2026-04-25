"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
/* biome-ignore lint/correctness/noUnusedImports: required by the JSX runtime used in node tests */
import React, { type ReactNode } from "react";
import { AppBanner } from "@/components/system/app-banner";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  getAppErrorDisplay,
  shouldExposeErrorReference,
} from "@/lib/errors/app-error";
import { cn } from "@/lib/utils";

type AppErrorSurfaceProps = {
  action?: ReactNode;
  className?: string;
  detail?: string;
  error?: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
};

export function AppErrorBanner({
  action,
  className,
  detail,
  error,
  onRetry,
  retryLabel = "Retry",
  title,
}: AppErrorSurfaceProps) {
  const display = getAppErrorDisplay(error, buildDisplayOptions(detail, title));
  const actionNode = buildErrorAction(action, onRetry, retryLabel);

  return (
    <AppBanner
      description={
        <ErrorDescription
          detail={detail ?? display.detail}
          requestId={shouldExposeErrorReference() ? display.requestId : null}
        />
      }
      title={title ?? display.title}
      tone="error"
      {...(actionNode ? { action: actionNode } : {})}
      {...(className ? { className } : {})}
    />
  );
}

export function AppErrorState({
  action,
  className,
  detail,
  error,
  onRetry,
  retryLabel = "Try again",
  title,
}: AppErrorSurfaceProps) {
  const display = getAppErrorDisplay(error, buildDisplayOptions(detail, title));

  return (
    <Empty
      className={cn(
        "rounded-xl border border-border/50 bg-card/85 py-14 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>{title ?? display.title}</EmptyTitle>
        <EmptyDescription>
          <ErrorDescription
            detail={detail ?? display.detail}
            requestId={shouldExposeErrorReference() ? display.requestId : null}
          />
        </EmptyDescription>
      </EmptyHeader>
      {action || onRetry ? (
        <EmptyContent>
          <div className="token-row">
            {onRetry ? (
              <Button onClick={onRetry} size="lg" type="button">
                <RotateCcw data-icon="inline-start" />
                {retryLabel}
              </Button>
            ) : null}
            {action}
          </div>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

function ErrorDescription({
  detail,
  requestId,
}: {
  detail: string;
  requestId: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span>{detail}</span>
      {requestId ? (
        <span className="text-xs text-muted-foreground">
          Reference ID:{" "}
          <span className="font-mono text-foreground">{requestId}</span>
        </span>
      ) : null}
    </div>
  );
}

function buildErrorAction(
  action: ReactNode | undefined,
  onRetry: (() => void) | undefined,
  retryLabel: string,
) {
  if (!action && !onRetry) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onRetry ? (
        <Button onClick={onRetry} size="sm" type="button" variant="outline">
          <RotateCcw data-icon="inline-start" />
          {retryLabel}
        </Button>
      ) : null}
      {action}
    </div>
  );
}

function buildDisplayOptions(
  detail: string | undefined,
  title: string | undefined,
) {
  return {
    ...(detail ? { fallbackDetail: detail } : {}),
    ...(title ? { fallbackTitle: title } : {}),
  };
}
