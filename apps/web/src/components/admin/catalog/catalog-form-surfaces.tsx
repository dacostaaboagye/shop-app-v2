"use client";

import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CatalogFormCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function CatalogFormError({
  error,
  title,
}: {
  error: unknown;
  title: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {error instanceof Error
          ? error.message
          : "An unexpected error occurred."}
      </AlertDescription>
    </Alert>
  );
}

export function CatalogFormActions({
  canSubmit,
  isBusy,
  onCancel,
  submitLabel,
  submittingLabel,
}: {
  canSubmit: boolean;
  isBusy: boolean;
  onCancel: () => void;
  submitLabel: string;
  submittingLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3">
      <Button onClick={onCancel} size="sm" type="button" variant="ghost">
        Cancel
      </Button>
      <Button disabled={!canSubmit || isBusy} size="sm" type="submit">
        {isBusy ? submittingLabel : submitLabel}
      </Button>
    </div>
  );
}
