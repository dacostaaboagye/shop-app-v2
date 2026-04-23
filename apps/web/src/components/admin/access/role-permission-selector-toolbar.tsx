"use client";

import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-border/50">
      <div className="relative min-w-[320px] flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 border-0 bg-muted pl-10 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
          disabled={disabled}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Filter by key or description"
          value={searchValue}
        />
      </div>

      <Select
        disabled={disabled}
        onValueChange={onDomainFilterChange}
        value={domainFilter}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder="All domains" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All domains</SelectItem>
          {domains.map((domain) => (
            <SelectItem key={domain.key} value={domain.key}>
              {domain.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          className="h-10 rounded-xl px-4 text-muted-foreground hover:text-foreground hover:bg-muted"
          disabled={disabled}
          onClick={onClearFilters}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X className="mr-2 size-4" />
          Clear filters
        </Button>
      ) : null}

      <div className="h-4 w-px bg-muted" />

      <Badge className="shrink-0" variant="secondary">
        {selectedCount} granted
      </Badge>

      {selectedCount > 0 ? (
        <Button
          className="h-10 rounded-xl"
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
          className="h-8 rounded-lg text-xs"
          disabled={disabled}
          onClick={onExpandAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          Expand all
        </Button>
        <Button
          className="h-8 rounded-lg text-xs"
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
