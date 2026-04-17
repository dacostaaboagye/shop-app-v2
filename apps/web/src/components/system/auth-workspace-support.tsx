"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthLoadingCard() {
  return (
    <Card className="surface-card">
      <CardContent className="flex flex-col gap-4 py-10">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-5/6" />
        <Skeleton className="h-10 w-4/6" />
      </CardContent>
    </Card>
  );
}
