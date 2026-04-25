"use client";

import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 bg-card shadow-panel",
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function AuthCardHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <CardHeader className="items-center gap-2 text-center">
      <CardTitle className="font-heading text-3xl font-bold tracking-tight">
        {title}
      </CardTitle>
      <p className="text-base text-muted-foreground">{description}</p>
    </CardHeader>
  );
}

export function AuthCardBody({ children }: { children: ReactNode }) {
  return (
    <CardContent className="flex flex-col gap-6 pt-0">{children}</CardContent>
  );
}

export function AuthFooterLink({
  href,
  label,
  prompt,
}: {
  href: Route;
  label: string;
  prompt: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 border-t border-border/20 pt-8 text-sm font-medium text-muted-foreground">
      {prompt}{" "}
      <Link
        className="font-bold text-primary transition-colors hover:text-primary/80"
        href={href}
      >
        {label}
      </Link>
    </div>
  );
}

export function AuthSectionDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative flex items-center gap-4 py-2">
      <div className="flex-1 border-t border-border/60" />
      <span className="type-data-label">{label}</span>
      <div className="flex-1 border-t border-border/60" />
    </div>
  );
}
