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

export function UserFilters({
  draftSearch,
  setDraftSearch,
  role,
  onRoleChange,
  status,
  onStatusChange,
  hasFilters,
  onClear,
  totalCount,
  availableRoles,
}: {
  draftSearch: string;
  setDraftSearch: (value: string) => void;
  role: string | null;
  onRoleChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  hasFilters: boolean;
  onClear: () => void;
  totalCount: number;
  availableRoles: Array<{ slug: string; name: string }>;
}) {
  return (
    <AdminDirectoryFilterPanel
      clearLabel="Clear"
      extraControls={
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:min-w-40">
            <Label htmlFor="users-filter-role">Role</Label>
            <Select onValueChange={onRoleChange} value={role || "all"}>
              <SelectTrigger className="h-10" id="users-filter-role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {availableRoles.map((roleOption) => (
                  <SelectItem key={roleOption.slug} value={roleOption.slug}>
                    {roleOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:min-w-40">
            <Label htmlFor="users-filter-status">Status</Label>
            <Select onValueChange={onStatusChange} value={status || "all"}>
              <SelectTrigger className="h-10" id="users-filter-status">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
      hasFilters={hasFilters}
      onClear={onClear}
      onDraftSearchChange={setDraftSearch}
      placeholder="Name, email, or role"
      searchId="users-filter-search"
      summary={`${formatCount(totalCount)} users${role ? " in the current role scope" : ""}${status !== "all" ? ` marked ${status}` : ""}${draftSearch ? " matching the current filters" : " across the directory"}`}
      value={draftSearch}
    />
  );
}
