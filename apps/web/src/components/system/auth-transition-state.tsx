"use client";

import { Spinner } from "@/components/ui/spinner";

export function AuthTransitionState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <Spinner className="h-8 w-8" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="type-support">{description}</p>
      </div>
    </div>
  );
}
