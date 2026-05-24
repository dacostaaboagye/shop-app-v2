"use client";

import type { AdminUserSummary } from "@shop/contracts";
import { AppFormField } from "@/components/forms/app-form-field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CustomerContactPortalAccess({
  disabled,
  onLink,
  onUserChange,
  selectId,
  selectedUserSlug,
  userOptions,
}: {
  disabled: boolean;
  onLink: () => void;
  onUserChange: (value: string) => void;
  selectId: string;
  selectedUserSlug: string;
  userOptions: AdminUserSummary[];
}) {
  return (
    <AppFormField
      description="Link an existing user account to grant this contact customer portal access."
      inputId={selectId}
      label="Portal account"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:min-w-72">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row">
          <Select
            disabled={disabled}
            onValueChange={onUserChange}
            value={selectedUserSlug}
          >
            <SelectTrigger className="min-w-0 flex-1 bg-muted/20" id={selectId}>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {userOptions.map((user) => (
                <SelectItem key={user.slug} value={user.slug}>
                  {user.firstName} {user.lastName} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={disabled || !selectedUserSlug}
            onClick={onLink}
            size="sm"
            type="button"
          >
            Link
          </Button>
        </div>
      </div>
    </AppFormField>
  );
}
