"use client";

import type { AdminCustomerDetail, AdminUserSummary } from "@shop/contracts";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSupportText } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { CustomerContactPortalAccess } from "./customer-contact-portal-access";

export function CustomerContactRow({
  contact,
  index,
  isPending,
  itemCount,
  onLinkPortalUser,
  onUnlinkPortalUser,
  userOptions,
}: {
  contact: AdminCustomerDetail["contacts"][number];
  index: number;
  isPending: boolean;
  itemCount: number;
  onLinkPortalUser: (contactReference: string, userSlug: string) => void;
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="type-data-value">{contact.name}</p>
          {contact.isPrimary ? (
            <Badge
              className="rounded-md text-[10px] font-semibold"
              variant="secondary"
            >
              Primary
            </Badge>
          ) : null}
          {contact.receivesInvoices ? (
            <Badge variant="outline">Invoices</Badge>
          ) : null}
          {contact.receivesDeliveryUpdates ? (
            <Badge variant="outline">Delivery updates</Badge>
          ) : null}
        </div>
        <p className="type-support mt-0.5">
          {formatSupportText(contact.roleTitle, contact.status)}
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
          <CustomerContactPortalAccess
            disabled={
              isPending ||
              userOptions.length === 0 ||
              contact.portalStatus === "inactive"
            }
            onLink={() =>
              onLinkPortalUser(contact.contactReference, selectedUserSlug)
            }
            onUserChange={setSelectedUserSlug}
            selectId={selectId}
            selectedUserSlug={selectedUserSlug}
            userOptions={userOptions}
          />
        )}
      </div>
    </div>
  );
}

function portalStatusLabel(
  status: AdminCustomerDetail["contacts"][number]["portalStatus"],
) {
  if (status === "linked") return "Linked";
  if (status === "inactive") return "Inactive";
  return "No portal access";
}
