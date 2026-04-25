"use client";

import type { AdminSupplierDetail, AdminUserSummary } from "@shop/contracts";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatSupportText } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { SupplierContactPortalAccess } from "./supplier-contact-portal-access";

export function SupplierContactRow({
  contact,
  index,
  isPending,
  itemCount,
  onInvitePortalUser,
  onLinkPortalUser,
  onRemove,
  onUnlinkPortalUser,
  userOptions,
}: {
  contact: AdminSupplierDetail["contacts"][number];
  index: number;
  isPending: boolean;
  itemCount: number;
  onInvitePortalUser: (contactReference: string) => void;
  onLinkPortalUser: (contactReference: string, userSlug: string) => void;
  onRemove: (contactReference: string) => void;
  onUnlinkPortalUser: (contactReference: string) => void;
  userOptions: AdminUserSummary[];
}) {
  const [selectedUserSlug, setSelectedUserSlug] = useState("");
  const selectId = useId();

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between",
        index !== itemCount - 1 && "border-b border-border/50",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="type-data-value">
            {contact.firstName} {contact.lastName}
          </p>
          {contact.isPrimary ? (
            <Badge
              className="rounded-md text-[10px] font-semibold"
              variant="secondary"
            >
              Primary
            </Badge>
          ) : null}
        </div>
        <p className="type-support mt-0.5">
          {formatSupportText(contact.jobTitle, "No job title")}
        </p>
        {(contact.email || contact.phone) && (
          <div className="type-support mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {contact.email && (
              <span className="underline decoration-border/50 underline-offset-2">
                {contact.email}
              </span>
            )}
            {contact.phone && <span>{contact.phone}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        {contact.userSlug ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-2">
            <div className="px-2">
              <p className="type-data-label">Portal Account</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="type-data-value text-sm">Linked portal account</p>
                <Badge variant="secondary">
                  {portalStatusLabel(contact.portalStatus)}
                </Badge>
              </div>
            </div>
            <Button
              className="h-8 rounded-lg"
              disabled={isPending}
              onClick={() => onUnlinkPortalUser(contact.contactReference)}
              size="sm"
              type="button"
              variant="outline"
            >
              Unlink
            </Button>
          </div>
        ) : (
          <SupplierContactPortalAccess
            contactEmail={contact.email}
            disabled={
              isPending ||
              userOptions.length === 0 ||
              contact.portalStatus === "inactive"
            }
            hasContactEmail={Boolean(contact.email)}
            isPending={isPending}
            onInvite={() => onInvitePortalUser(contact.contactReference)}
            onLink={() =>
              onLinkPortalUser(contact.contactReference, selectedUserSlug)
            }
            onUserChange={setSelectedUserSlug}
            portalStatus={contact.portalStatus}
            selectId={selectId}
            selectedUserSlug={selectedUserSlug}
            userOptions={userOptions}
          />
        )}
        {!contact.isPrimary ? (
          <Button
            disabled={isPending}
            onClick={() => onRemove(contact.contactReference)}
            size="sm"
            type="button"
            variant="outline"
          >
            Remove
          </Button>
        ) : null}
      </div>
      {contact.latestInvite ? (
        <div className="type-support flex min-w-0 flex-col gap-1 lg:ml-auto lg:min-w-56">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={inviteBadgeVariant(contact.latestInvite.deliveryStatus)}
            >
              {formatInviteStatus(contact.latestInvite.deliveryStatus)}
            </Badge>
            <span>{formatDateTime(contact.latestInvite.attemptedAt)}</span>
          </div>
          <p className="overflow-wrap-anywhere">
            {contact.latestInvite.recipientEmail}
          </p>
          {contact.latestInvite.deliveryReason ? (
            <p className="overflow-wrap-anywhere">
              {contact.latestInvite.deliveryReason}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function portalStatusLabel(
  status: AdminSupplierDetail["contacts"][number]["portalStatus"],
) {
  if (status === "invited") return "Invited";
  if (status === "linked") return "Linked";
  if (status === "inactive") return "Inactive";
  return "No portal access";
}

function formatInviteStatus(
  status: NonNullable<
    AdminSupplierDetail["contacts"][number]["latestInvite"]
  >["deliveryStatus"],
) {
  switch (status) {
    case "sent":
      return "Invite sent";
    case "delivered":
      return "Delivered";
    case "console_fallback":
      return "Console fallback";
    case "failed":
      return "Invite failed";
    case "bounced":
      return "Bounced";
    case "complained":
      return "Complained";
    case "suppressed":
      return "Suppressed";
    case "delayed":
      return "Delayed";
  }
}

function inviteBadgeVariant(
  status: NonNullable<
    AdminSupplierDetail["contacts"][number]["latestInvite"]
  >["deliveryStatus"],
) {
  switch (status) {
    case "sent":
    case "delivered":
    case "console_fallback":
      return "secondary" as const;
    default:
      return "destructive" as const;
  }
}
