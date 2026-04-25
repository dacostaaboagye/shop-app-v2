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

export function SupplierFilters({
  draftSearch,
  onDraftSearchChange,
  status,
  onStatusChange,
  hasFilters,
  onClear,
  totalCount,
}: {
  draftSearch: string;
  onDraftSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  hasFilters: boolean;
  onClear: () => void;
  totalCount: number;
}) {
  return (
    <AdminDirectoryFilterPanel
      extraControls={
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:min-w-40">
          <Label htmlFor="supplier-filter-status">Status</Label>
          <Select onValueChange={onStatusChange} value={status}>
            <SelectTrigger className="h-10" id="supplier-filter-status">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      hasFilters={hasFilters}
      onClear={onClear}
      onDraftSearchChange={onDraftSearchChange}
      placeholder="Supplier name or email"
      searchId="supplier-filter-search"
      summary={`${formatCount(totalCount)} supplier${totalCount === 1 ? "" : "s"}${status !== "all" ? ` marked ${status}` : ""}${draftSearch ? " matching the current filters" : " across the workspace"}`}
      value={draftSearch}
    />
  );
}
