"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminDirectoryFilterPanel({
  clearLabel = "Clear",
  extraControls,
  hasFilters,
  hideSearch = false,
  onClear,
  onDraftSearchChange,
  placeholder,
  searchId,
  searchLabel = "Search",
  summary,
  trailingControls,
  value,
}: {
  clearLabel?: string;
  extraControls?: ReactNode;
  hasFilters: boolean;
  hideSearch?: boolean;
  onClear: () => void;
  onDraftSearchChange: (value: string) => void;
  placeholder: string;
  searchId: string;
  searchLabel?: string;
  summary: ReactNode;
  trailingControls?: ReactNode;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div
            className={
              hideSearch
                ? "grid gap-3"
                : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"
            }
          >
            {!hideSearch ? (
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={searchId}>{searchLabel}</Label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    id={searchId}
                    onChange={(event) =>
                      onDraftSearchChange(event.target.value)
                    }
                    placeholder={placeholder}
                    value={value}
                  />
                </div>
              </div>
            ) : null}
            {extraControls ? (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
                {extraControls}
              </div>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-end justify-start gap-2 lg:justify-end">
            {hasFilters ? (
              <Button
                onClick={onClear}
                size="sm"
                type="button"
                variant="outline"
              >
                <X className="size-3.5" data-icon="inline-start" />
                {clearLabel}
              </Button>
            ) : null}
            {trailingControls}
          </div>
        </div>
        <div className="type-support type-inline-metric text-muted-foreground">
          {summary}
        </div>
      </div>
    </div>
  );
}
