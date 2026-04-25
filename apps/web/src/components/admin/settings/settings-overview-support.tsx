"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { toRoute } from "@/lib/routes";

export function SettingsLinkCard({
  description,
  href,
  label,
  meta,
}: {
  description: string;
  href: string;
  label: string;
  meta?: ReactNode;
}) {
  return (
    <Link className="group" href={toRoute(href)}>
      <Card className="h-full border-border/70 bg-card shadow-none transition-colors group-hover:border-border group-hover:bg-muted/20">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          {meta ? (
            <div className="type-support mt-auto text-muted-foreground">
              {meta}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
