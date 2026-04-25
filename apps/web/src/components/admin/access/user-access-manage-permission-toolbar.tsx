"use client";

import { AdminDirectoryFilterPanel } from "@/components/admin/admin-directory-filter-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
    <AdminDirectoryFilterPanel
      extraControls={
        <>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="user-access-domain-filter">Domain</Label>
            <Select onValueChange={onDomainFilterChange} value={domainFilter}>
              <SelectTrigger className="h-10" id="user-access-domain-filter">
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
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="user-access-state-filter">Show</Label>
            <Select
              onValueChange={(value) =>
                onShowFilterChange(value as "all" | "granted" | "overrides")
              }
              value={showFilter}
            >
              <SelectTrigger className="h-10" id="user-access-state-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All permissions</SelectItem>
                <SelectItem value="granted">Granted only</SelectItem>
                <SelectItem value="overrides">Overrides only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
      hasFilters={hasFilters}
      onClear={onClear}
      onDraftSearchChange={onSearchChange}
      placeholder="Permission key or description"
      searchId="user-access-permission-search"
      summary="Filter by domain, granted state, or override state."
      trailingControls={
        <div className="flex min-w-0 flex-wrap items-center gap-1">
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
      }
      value={search}
    />
  );
}
