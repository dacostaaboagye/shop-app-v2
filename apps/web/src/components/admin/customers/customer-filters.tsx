"use client";

import { AdminDirectoryFilterPanel } from "@/components/admin/admin-directory-filter-panel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/display/format";

export function CustomerFilters({
  draftSearch,
  hasFilters,
  onClear,
  onDraftSearchChange,
  onStatusChange,
  onTypeChange,
  status,
  totalCount,
  type,
}: {
  draftSearch: string;
  hasFilters: boolean;
  onClear: () => void;
  onDraftSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  status: string;
  totalCount: number;
  type: string;
}) {
  return (
    <AdminDirectoryFilterPanel
      extraControls={
        <>
          <FilterSelect
            id="customer-filter-status"
            label="Status"
            onValueChange={onStatusChange}
            options={[
              ["all", "All status"],
              ["active", "Active"],
              ["inactive", "Inactive"],
              ["blocked", "Blocked"],
            ]}
            value={status}
          />
          <FilterSelect
            id="customer-filter-type"
            label="Type"
            onValueChange={onTypeChange}
            options={[
              ["all", "All types"],
              ["business", "Business"],
              ["individual", "Individual"],
            ]}
            value={type}
          />
        </>
      }
      hasFilters={hasFilters}
      onClear={onClear}
      onDraftSearchChange={onDraftSearchChange}
      placeholder="Customer name, reference, tax number, or contact"
      searchId="customer-filter-search"
      summary={`${formatCount(totalCount)} customer${totalCount === 1 ? "" : "s"}${status !== "all" ? ` marked ${status}` : ""}${type !== "all" ? ` in ${type}` : ""}${draftSearch ? " matching the current filters" : " across the workspace"}`}
      value={draftSearch}
    />
  );
}

function FilterSelect({
  id,
  label,
  onValueChange,
  options,
  value,
}: {
  id: string;
  label: string;
  onValueChange: (value: string) => void;
  options: [string, string][];
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:min-w-40">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger className="h-10" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
