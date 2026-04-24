"use client";

import type { AdminPermissionSummary } from "@shop/contracts";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildPermissionGroups,
  getPermissionGroupKey,
} from "@/lib/access-control";
import {
  OVERRIDE_BADGE_CLASS_NAMES,
  ROLE_SCOPE_BADGE_CLASSES,
} from "@/lib/admin-models";
import { cn } from "@/lib/utils";
import { RolePermissionSelectorToolbar } from "./role-permission-selector-toolbar";

type RolePermissionSelectorProps = {
  disabled?: boolean;
  onChange: (nextSelectedKeys: string[]) => void;
  permissions: readonly AdminPermissionSummary[];
  searchValue: string;
  selectedKeys: readonly string[];
  setSearchValue: (value: string) => void;
};

export function RolePermissionSelector({
  disabled = false,
  onChange,
  permissions,
  searchValue,
  selectedKeys,
  setSearchValue,
}: RolePermissionSelectorProps) {
  const [domainFilter, setDomainFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const normalizedQuery = searchValue.trim().toLowerCase();

  const filteredPermissions = permissions.filter((permission) => {
    if (
      normalizedQuery &&
      !`${permission.key} ${permission.description}`
        .toLowerCase()
        .includes(normalizedQuery)
    ) {
      return false;
    }

    if (
      domainFilter &&
      getPermissionGroupKey(permission.key) !== domainFilter
    ) {
      return false;
    }

    return true;
  });

  const groups = buildPermissionGroups(filteredPermissions);
  const allGroupKeys = groups.map((g) => g.key);
  const domains = buildPermissionGroups(permissions).map((g) => ({
    key: g.key,
    label: g.label,
  }));

  const hasFilters = normalizedQuery !== "" || domainFilter !== "";

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function togglePermission(permissionKey: string) {
    if (selectedKeys.includes(permissionKey)) {
      onChange(selectedKeys.filter((k) => k !== permissionKey));
    } else {
      onChange(
        [...selectedKeys, permissionKey].sort((a, b) => a.localeCompare(b)),
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RolePermissionSelectorToolbar
        disabled={disabled}
        domainFilter={domainFilter}
        domains={domains}
        hasFilters={hasFilters}
        onClearFilters={() => {
          setSearchValue("");
          setDomainFilter("");
        }}
        onClearSelection={() => onChange([])}
        onCollapseAll={() => setExpandedGroups(new Set())}
        onDomainFilterChange={setDomainFilter}
        onExpandAll={() => setExpandedGroups(new Set(allGroupKeys))}
        searchValue={searchValue}
        selectedCount={selectedKeys.length}
        setSearchValue={setSearchValue}
      />

      {/* Accordion groups */}
      {groups.length === 0 ? (
        <AppEmptyState
          description="Try a different search term or clear the current filter."
          kind="no-results"
          title="No permissions match"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const grantedCount = group.items.filter((p) =>
              selectedKeys.includes(p.key),
            ).length;

            return (
              <div
                key={group.key}
                className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-none"
              >
                {/* Group header */}
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  disabled={disabled}
                  onClick={() => toggleGroup(group.key)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{group.label}</span>
                    <Badge
                      className={cn(
                        "text-[0.65rem]",
                        grantedCount > 0 && ROLE_SCOPE_BADGE_CLASSES.custom,
                      )}
                      variant={grantedCount > 0 ? "outline" : "secondary"}
                    >
                      {grantedCount}/{group.items.length} granted
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {/* Permission rows */}
                {isExpanded ? (
                  <div className="divide-y divide-border/40 border-t border-border/60">
                    {group.items.map((permission) => {
                      const isGranted = selectedKeys.includes(permission.key);

                      return (
                        <div
                          key={permission.key}
                          className={cn(
                            "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
                            isGranted && "bg-primary/5 dark:bg-primary/10",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-mono text-xs text-foreground">
                                {permission.key}
                              </p>
                              {isGranted ? (
                                <Badge
                                  className={cn(
                                    "text-[0.65rem]",
                                    OVERRIDE_BADGE_CLASS_NAMES.allow,
                                  )}
                                  variant="outline"
                                >
                                  <Check className="size-2.5" />
                                  Granted
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          </div>

                          <Button
                            disabled={disabled}
                            onClick={() => togglePermission(permission.key)}
                            size="sm"
                            type="button"
                            variant={isGranted ? "secondary" : "outline"}
                          >
                            {isGranted ? "Remove" : "Grant"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
