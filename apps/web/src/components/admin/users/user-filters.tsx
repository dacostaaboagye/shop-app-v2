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
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-border/50">
      <div className="relative min-w-[320px] flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 border-0 bg-muted pl-10 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
          onChange={(event) => setDraftSearch(event.target.value)}
          placeholder="Search name, email, or role..."
          value={draftSearch}
        />
      </div>

      <div className="flex items-center gap-2">
        <Select onValueChange={onRoleChange} value={role || "all"}>
          <SelectTrigger className="min-w-[140px]">
            <SelectValue />
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

        <Select onValueChange={onStatusChange} value={status || "all"}>
          <SelectTrigger className="min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasFilters ? (
        <Button
          onClick={onClear}
          size="sm"
          type="button"
          variant="ghost"
          className="h-10 rounded-xl px-4 text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="mr-2 size-4" />
          Clear filters
        </Button>
      ) : null}

      <div className="ml-auto flex items-center gap-3 pr-2">
        <div className="h-4 w-px bg-muted" />
        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
          {totalCount} total
        </span>
      </div>
    </div>
  );
}
