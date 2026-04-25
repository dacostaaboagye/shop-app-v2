"use client";

import { Pencil, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { PageShell } from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CatalogDetailHeaderActions({
  isEditing,
  isPending,
  onCancel,
  onDelete,
  onEdit,
  permission,
}: {
  isEditing: boolean;
  isPending: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
  permission:
    | "catalog.brands.manage"
    | "catalog.categories.manage"
    | "catalog.products.manage";
}) {
  return !isEditing ? (
    <div className="flex items-center gap-2">
      <PermissionGate permission={permission}>
        <Button
          disabled={isPending}
          onClick={onEdit}
          size="sm"
          type="button"
          variant="outline"
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </PermissionGate>
      <PermissionGate permission={permission}>
        <Button
          disabled={isPending}
          onClick={onDelete}
          size="sm"
          type="button"
          variant="outline-destructive"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </PermissionGate>
    </div>
  ) : (
    <Button onClick={onCancel} size="sm" type="button" variant="ghost">
      <X className="size-3.5" />
      Cancel
    </Button>
  );
}

export function CatalogDetailSkeleton({
  statCount = 2,
}: {
  statCount?: number;
}) {
  const statSkeletonKeys = Array.from(
    { length: statCount },
    (_, position) => `catalog-detail-stat-${position + 1}`,
  );

  return (
    <PageShell>
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statSkeletonKeys.map((key) => (
          <Skeleton className="h-24" key={key} />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </PageShell>
  );
}

export function CatalogDetailError({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <PageShell>
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </PageShell>
  );
}

export function CatalogDetailsCard({
  children,
  columnsClassName = "sm:grid-cols-2",
  title,
}: {
  children: ReactNode;
  columnsClassName?: string;
  title: string;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={`grid gap-4 text-sm ${columnsClassName}`}>
        {children}
      </CardContent>
    </Card>
  );
}

export function CatalogDetailRow({
  className,
  label,
  tone = "default",
  value,
}: {
  className?: string;
  label: string;
  tone?: "default" | "identifier" | "support";
  value: ReactNode;
}) {
  const valueClassName =
    tone === "identifier"
      ? "type-identifier text-muted-foreground"
      : tone === "support"
        ? "type-support text-muted-foreground"
        : "text-foreground";

  return (
    <div className={className ?? "flex flex-col gap-1"}>
      <p className="type-data-label text-muted-foreground">{label}</p>
      <div className={valueClassName}>{value}</div>
    </div>
  );
}
