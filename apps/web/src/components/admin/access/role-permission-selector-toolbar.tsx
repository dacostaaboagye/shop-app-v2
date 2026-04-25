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
import { formatCount } from "@/lib/display/format";

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
    <AdminDirectoryFilterPanel
      clearLabel="Clear filters"
      extraControls={
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="role-permission-domain-filter">Domain</Label>
          <Select
            disabled={disabled}
            onValueChange={onDomainFilterChange}
            value={domainFilter}
          >
            <SelectTrigger id="role-permission-domain-filter">
              <SelectValue placeholder="All domains" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All domains</SelectItem>
              {domains.map((domain) => (
                <SelectItem key={domain.key} value={domain.key}>
                  {domain.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      hasFilters={hasFilters}
      onClear={onClearFilters}
      onDraftSearchChange={setSearchValue}
      placeholder="Permission key or description"
      searchId="role-permission-search"
      summary={`${formatCount(selectedCount)} permissions currently granted`}
      trailingControls={
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {selectedCount > 0 ? (
            <Button
              disabled={disabled}
              onClick={onClearSelection}
              size="sm"
              type="button"
              variant="outline"
            >
              Clear granted
            </Button>
          ) : null}
          <Button
            disabled={disabled}
            onClick={onExpandAll}
            size="sm"
            type="button"
            variant="ghost"
          >
            Expand all
          </Button>
          <Button
            disabled={disabled}
            onClick={onCollapseAll}
            size="sm"
            type="button"
            variant="ghost"
          >
            Collapse all
          </Button>
        </div>
      }
      value={searchValue}
    />
  );
}
