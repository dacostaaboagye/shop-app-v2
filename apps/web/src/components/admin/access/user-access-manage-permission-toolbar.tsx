"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-border/50">
      <div className="relative min-w-[320px] flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 border-0 bg-muted pl-10 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by key or description"
          value={search}
        />
      </div>

      <Select onValueChange={onDomainFilterChange} value={domainFilter}>
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

      <Select
        onValueChange={(value) =>
          onShowFilterChange(value as "all" | "granted" | "overrides")
        }
        value={showFilter}
      >
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All permissions</SelectItem>
          <SelectItem value="granted">Granted only</SelectItem>
          <SelectItem value="overrides">Overrides only</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          className="h-10 rounded-xl px-4 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onClear}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X className="mr-2 size-4" />
          Clear filters
        </Button>
      ) : null}

      <div className="ml-auto flex items-center gap-1">
        <Button
          className="h-8 rounded-lg text-xs"
          onClick={onExpandAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          Expand all
        </Button>
        <Button
          className="h-8 rounded-lg text-xs"
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
