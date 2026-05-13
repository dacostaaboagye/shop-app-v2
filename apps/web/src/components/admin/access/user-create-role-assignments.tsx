"use client";

import type { AdminLocationSummary, AdminRoleSummary } from "@shop/contracts";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  addRoleAssignment,
  GLOBAL_LOCATION_VALUE,
  MAX_ROLE_ASSIGNMENTS,
  removeRoleAssignment,
  type UserCreateRoleAssignmentValue,
  updateRoleAssignment,
} from "./user-create-form.support";

export function UserCreateRoleAssignments({
  assignments,
  disabled,
  locations,
  onChange,
  roles,
}: {
  assignments: readonly UserCreateRoleAssignmentValue[];
  disabled: boolean;
  locations: readonly AdminLocationSummary[];
  onChange: (value: UserCreateRoleAssignmentValue[]) => void;
  roles: readonly AdminRoleSummary[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {assignments.map((assignment, index) => (
        <div
          className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
          key={assignment.clientId}
        >
          <div className="flex min-w-0 flex-col gap-2">
            <FieldLabel htmlFor={`role-assignment-${index}-role`}>
              Role
            </FieldLabel>
            <Select
              onValueChange={(roleSlug) =>
                onChange(
                  updateRoleAssignment(assignments, assignment.clientId, {
                    roleSlug,
                  }),
                )
              }
              value={assignment.roleSlug}
            >
              <SelectTrigger
                disabled={disabled}
                id={`role-assignment-${index}-role`}
              >
                <SelectedValueLabel
                  label={getRoleLabel(roles, assignment.roleSlug)}
                  placeholder="Select role..."
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <FieldLabel htmlFor={`role-assignment-${index}-location`}>
              Scope
            </FieldLabel>
            <Select
              onValueChange={(locationSlug) =>
                onChange(
                  updateRoleAssignment(assignments, assignment.clientId, {
                    locationSlug,
                  }),
                )
              }
              value={assignment.locationSlug}
            >
              <SelectTrigger
                disabled={disabled}
                id={`role-assignment-${index}-location`}
              >
                <SelectedValueLabel
                  label={getLocationLabel(locations, assignment.locationSlug)}
                  placeholder="Select scope..."
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={GLOBAL_LOCATION_VALUE}>Global</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.slug} value={location.slug}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {assignments.length > 1 ? (
            <Button
              className="justify-self-start md:justify-self-end"
              disabled={disabled}
              onClick={() =>
                onChange(removeRoleAssignment(assignments, assignment.clientId))
              }
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <Trash2 data-icon="inline-start" />
              <span className="sr-only">Remove assignment</span>
            </Button>
          ) : null}
        </div>
      ))}

      <Button
        className="self-start"
        disabled={disabled || assignments.length >= MAX_ROLE_ASSIGNMENTS}
        onClick={() => onChange(addRoleAssignment(assignments))}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus data-icon="inline-start" />
        Add another role
      </Button>
    </div>
  );
}

function SelectedValueLabel({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
  return (
    <span className={label ? "truncate" : "truncate text-muted-foreground"}>
      {label || placeholder}
    </span>
  );
}

function getRoleLabel(
  roles: readonly AdminRoleSummary[],
  roleSlug: string,
): string {
  return roles.find((role) => role.slug === roleSlug)?.name ?? "";
}

function getLocationLabel(
  locations: readonly AdminLocationSummary[],
  locationSlug: string,
): string {
  if (locationSlug === GLOBAL_LOCATION_VALUE) {
    return "Global";
  }

  return (
    locations.find((location) => location.slug === locationSlug)?.name ?? ""
  );
}
