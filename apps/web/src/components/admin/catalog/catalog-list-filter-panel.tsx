"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/display/format";

export function CatalogListFilterPanel({
  activeSearch,
  draftSearch,
  entityLabelPlural,
  hasFilters,
  onClear,
  onDraftSearchChange,
  onStatusChange,
  status,
  totalCount,
}: {
  activeSearch: string;
  draftSearch: string;
  entityLabelPlural: string;
  hasFilters: boolean;
  onClear: () => void;
  onDraftSearchChange: (value: string) => void;
  onStatusChange: (value: string | null) => void;
  status: string;
  totalCount: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)_auto]">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={`${entityLabelPlural}-filter-search`}>Search</Label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                id={`${entityLabelPlural}-filter-search`}
                onChange={(event) => onDraftSearchChange(event.target.value)}
                placeholder="Name or slug"
                value={draftSearch}
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={`${entityLabelPlural}-filter-status`}>Status</Label>
            <Select
              onValueChange={(value) =>
                onStatusChange(value === "all" ? null : value)
              }
              value={status}
            >
              <SelectTrigger
                className="h-10 w-full"
                id={`${entityLabelPlural}-filter-status`}
              >
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 items-end">
            {hasFilters ? (
              <Button
                onClick={onClear}
                size="sm"
                type="button"
                variant="outline"
              >
                <X className="size-3.5" data-icon="inline-start" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>
        <p className="type-support type-inline-metric text-muted-foreground">
          {formatCount(totalCount)} {entityLabelPlural}
          {status !== "all" ? ` in ${status}` : ""}
          {activeSearch
            ? " matching the current filters"
            : " across the catalogue"}
        </p>
      </div>
    </div>
  );
}
