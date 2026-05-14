"use client";

import type { ReactNode } from "react";

export function TransferDetailSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h3 className="type-data-value text-sm">{title}</h3>
      <dl className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
        {children}
      </dl>
    </section>
  );
}

export function TransferDetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="type-kicker text-muted-foreground">{label}</dt>
      <dd className="type-data-value break-words text-sm">{value}</dd>
    </div>
  );
}