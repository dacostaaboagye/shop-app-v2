"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthLoadingCard() {
  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/60 p-10 backdrop-blur-xl shadow-2xl shadow-black/5">
      <div className="flex flex-col gap-4 py-10">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-5/6 rounded-xl" />
        <Skeleton className="h-10 w-4/6 rounded-xl" />
      </div>
    </div>
  );
}
