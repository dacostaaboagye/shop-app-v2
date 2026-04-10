"use client";

import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type RolePermissionSelectorToolbarProps = {
  disabled: boolean;
  domainFilter: string;
  domains: Array<{ key: string; label: string }>;
  hasFilters: boolean;
  onClearFilters: () => void;
  onClearSelection: () => void;
  onCollapseAll: () => void;
  onDomainFilterChange: (value: string) => void;
  onExpandAll: () => void;
  searchValue: string;
  selectedCount: number;
  setSearchValue: (value: string) => void;
};

export function RolePermissionSelectorToolbar({
  disabled,
  domainFilter,
  domains,
  hasFilters,
  onClearFilters,
  onClearSelection,
  onCollapseAll,
  onDomainFilterChange,
  onExpandAll,
  searchValue,
  selectedCount,
  setSearchValue,
}: RolePermissionSelectorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          disabled={disabled}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Filter by key or description"
          value={searchValue}
        />
      </div>

      <Select
        aria-label="Filter by domain"
        className="h-9"
        disabled={disabled}
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

      {hasFilters ? (
        <Button
          disabled={disabled}
          onClick={onClearFilters}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X data-icon="inline-start" />
          Clear
        </Button>
      ) : null}

      <Badge className="shrink-0" variant="secondary">
        {selectedCount} granted
      </Badge>

      {selectedCount > 0 ? (
        <Button
          disabled={disabled}
          onClick={onClearSelection}
          size="sm"
          type="button"
          variant="outline"
        >
          Clear all
        </Button>
      ) : null}

      <div className="ml-auto flex items-center gap-1">
        <Button
          className="text-xs"
          disabled={disabled}
          onClick={onExpandAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          Expand all
        </Button>
        <Button
          className="text-xs"
          disabled={disabled}
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
