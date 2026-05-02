"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CatalogHistoryEntityKind } from "@/lib/react-query/admin-catalog-history";
import { CatalogHistoryList } from "./catalog-history-list";

type HistoryPanelProps = {
  entityKind: CatalogHistoryEntityKind;
  slug: string;
};

export function HistoryPanel({ entityKind, slug }: HistoryPanelProps) {
  // Lazy-mount the list so the change-log endpoint is only called when the
  // user actually opens the panel. This keeps the detail page's first paint
  // cheap and avoids burning permission-checked traffic on never-opened
  // tabs.
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Change history</CardTitle>
          <CardDescription>
            A chronological record of edits, archives, and restores for this
            entity.
          </CardDescription>
        </div>
        <Button
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          size="sm"
          type="button"
          variant="outline"
        >
          {isOpen ? "Hide history" : "Show history"}
        </Button>
      </CardHeader>
      {isOpen ? (
        <CardContent>
          <CatalogHistoryList entityKind={entityKind} slug={slug} />
        </CardContent>
      ) : null}
    </Card>
  );
}
