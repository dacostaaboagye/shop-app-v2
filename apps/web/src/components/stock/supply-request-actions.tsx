"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SupplyRequestActionStack({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

export function SupplyRequestSplitActions({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function SupplyRequestPrimaryButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button className={cn("w-full gap-2", className)} size="lg" {...props}>
      {children}
    </Button>
  );
}

export function SupplyRequestSecondaryButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "w-full gap-2 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive",
        className,
      )}
      size="lg"
      variant="outline"
      {...props}
    >
      {children}
    </Button>
  );
}

export function SupplyRequestDecisionButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("min-w-0 flex-1 gap-2", className)}
      size="lg"
      {...props}
    >
      {children}
    </Button>
  );
}
