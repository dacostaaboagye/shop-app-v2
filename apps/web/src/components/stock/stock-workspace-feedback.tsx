"use client";

import { AppErrorBanner } from "@/components/system/app-error";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_LIST_SKELETON_KEYS = [1, 2, 3, 4, 5] as const;
const DEFAULT_TABLE_SKELETON_KEYS = [1, 2, 3, 4, 5, 6] as const;

export function StockWorkspaceListSkeleton({
  cardClassName = "h-44 w-full rounded-xl",
  keys = DEFAULT_LIST_SKELETON_KEYS,
}: {
  cardClassName?: string;
  keys?: readonly (number | string)[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {keys.map((key) => (
        <Skeleton className={cardClassName} key={key} />
      ))}
    </div>
  );
}

export function StockWorkspaceSplitSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Skeleton className="h-[560px] rounded-xl" />
      <Skeleton className="h-[560px] rounded-xl" />
    </div>
  );
}

export function StockWorkspaceTableSkeleton({
  keys = DEFAULT_TABLE_SKELETON_KEYS,
  rowClassName = "h-11 w-full rounded-lg",
}: {
  keys?: readonly (number | string)[];
  rowClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-4">
      {keys.map((key) => (
        <Skeleton className={rowClassName} key={key} />
      ))}
    </div>
  );
}

export function StockWorkspaceError({
  detail,
  error,
  onRetry,
  title,
}: {
  detail: string;
  error: Error | null;
  onRetry: () => void;
  title: string;
}) {
  return (
    <AppErrorBanner
      detail={detail}
      error={error}
      onRetry={onRetry}
      title={title}
    />
  );
}
