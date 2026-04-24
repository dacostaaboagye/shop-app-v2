"use client";

import type { ReactNode } from "react";

export function SettingsTabSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground/80">{description}</p>
      </div>
      <div className="grid gap-8">{children}</div>
    </div>
  );
}
