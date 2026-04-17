"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function UserAccessManagePermissionToolbar({
  domainFilter,
  domains,
  hasFilters,
  onClear,
  onCollapseAll,
  onDomainFilterChange,
  onExpandAll,
  onSearchChange,
  onShowFilterChange,
  search,
  showFilter,
}: {
  domainFilter: string;
  domains: ReadonlyArray<{ key: string; label: string }>;
  hasFilters: boolean;
  onClear: () => void;
  onCollapseAll: () => void;
  onDomainFilterChange: (value: string) => void;
  onExpandAll: () => void;
  onSearchChange: (value: string) => void;
  onShowFilterChange: (value: "all" | "granted" | "overrides") => void;
  search: string;
  showFilter: "all" | "granted" | "overrides";
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by key or description"
          value={search}
        />
      </div>
      <Select
        aria-label="Filter by domain"
        className="h-9"
        onChange={(event) => onDomainFilterChange(event.target.value)}
        value={domainFilter}
      >
        <option value="">All domains</option>
        {domains.map((domain) => (
          <option key={domain.key} value={domain.key}>
            {domain.label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Show filter"
        className="h-9"
        onChange={(event) =>
          onShowFilterChange(
            event.target.value as "all" | "granted" | "overrides",
          )
        }
        value={showFilter}
      >
        <option value="all">All permissions</option>
        <option value="granted">Granted only</option>
        <option value="overrides">Overrides only</option>
      </Select>
      {hasFilters ? (
        <Button onClick={onClear} size="sm" type="button" variant="ghost">
          <X data-icon="inline-start" />
          Clear
        </Button>
      ) : null}
      <div className="ml-auto flex items-center gap-1">
        <Button
          className="text-xs"
          onClick={onExpandAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          Expand all
        </Button>
        <Button
          className="text-xs"
          onClick={onCollapseAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          Collapse all
        </Button>
      </div>
    </div>
  );
}
