"use client";

import type { PortalKey } from "@shop/contracts";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/display/format";
import { PersonAvatar } from "./person-avatar";

export const portalLabels: Record<PortalKey, string> = {
  admin: "Admin",
  agent: "Agent",
  customer: "Customer",
  manager: "Manager",
  supplier: "Supplier",
  worker: "Worker",
};

type AccountIdentityCardProps = {
  user: {
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastLoginAt: string | null;
    lastName: string;
    primaryImageUrl?: string | null | undefined;
  } | null;
};

export function AccountIdentityCard({ user }: AccountIdentityCardProps) {
  return (
    <section className="rounded-lg border border-border bg-muted/35 p-4">
      <div className="flex items-start gap-4">
        <PersonAvatar
          firstName={user?.firstName}
          imageUrl={user?.primaryImageUrl}
          interactive={false}
          lastName={user?.lastName}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {user ? `${user.firstName} ${user.lastName}` : "Signed out"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                {user?.email ?? "No active session"}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {user?.emailVerified ? (
                <Badge variant="secondary">Email Verified</Badge>
              ) : (
                <Badge variant="outline">Email Pending</Badge>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground">Last Sign-In:</span>{" "}
              {user?.lastLoginAt
                ? formatDateTime(user.lastLoginAt, {
                    empty: "No recorded sign-in",
                  })
                : "No recorded sign-in"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

type PreferenceRowProps = {
  checked: boolean;
  description: string;
  disabled?: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
};

export function PreferenceRow({
  checked,
  description,
  disabled = false,
  id,
  label,
  onCheckedChange,
}: PreferenceRowProps) {
  return (
    <label
      className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
      htmlFor={id}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
}
