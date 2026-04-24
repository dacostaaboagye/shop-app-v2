"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function AuthLoadingCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card p-10 shadow-panel">
      <div className="flex flex-col gap-4 py-10">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-5/6 rounded-xl" />
        <Skeleton className="h-10 w-4/6 rounded-xl" />
      </div>
    </div>
  );
}
