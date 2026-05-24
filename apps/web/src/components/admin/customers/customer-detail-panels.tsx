"use client";

import type { AdminCustomerDetail, AdminUserSummary } from "@shop/contracts";
import { type Building2, History, Mail, MapPin } from "lucide-react";
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { PermissionGate } from "@/components/system/permission-gate";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import type { CustomerAddressFormValues } from "./customer-address-form";
import { CustomerAddressForm } from "./customer-address-form";
import type { CustomerContactFormValues } from "./customer-contact-form";
import { CustomerContactForm } from "./customer-contact-form";
import { CustomerContactRow } from "./customer-contact-row";

export function ContactsPanel({
  contacts,
  error,
  isPending,
  onAddContact,
  onLinkPortalUser,
  onUnlinkPortalUser,
  portalAccessPending,
  userOptions,
}: {
  contacts: AdminCustomerDetail["contacts"];
  error?: Error | null | undefined;
  isPending: boolean;
  onAddContact: (values: CustomerContactFormValues) => void;
  onLinkPortalUser: (contactReference: string, userSlug: string) => void;
  onUnlinkPortalUser: (contactReference: string) => void;
  portalAccessPending: boolean;
  userOptions: AdminUserSummary[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {contacts.length === 0 ? (
        <AppEmptyState
          description="Add invoice or delivery contacts so customer-facing documents have the right recipients."
          icon={Mail}
          kind="no-data"
          title="No contacts"
        />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card shadow-none">
          {contacts.map((contact, index) => (
            <CustomerContactRow
              contact={contact}
              index={index}
              isPending={portalAccessPending}
              itemCount={contacts.length}
              key={contact.contactReference}
              onLinkPortalUser={onLinkPortalUser}
              onUnlinkPortalUser={onUnlinkPortalUser}
              userOptions={userOptions}
            />
          ))}
        </div>
      )}
      <PermissionGate permission="customers.manage">
        <CatalogFormCard
          description="Add one person who represents this customer for billing, delivery, or support."
          title="Add contact"
        >
          <CustomerContactForm
            error={error}
            isPending={isPending}
            onSubmit={onAddContact}
          />
        </CatalogFormCard>
      </PermissionGate>
    </div>
  );
}

export function AddressesPanel({
  addresses,
  error,
  isPending,
  onAddAddress,
}: {
  addresses: AdminCustomerDetail["addresses"];
  error?: Error | null | undefined;
  isPending: boolean;
  onAddAddress: (values: CustomerAddressFormValues) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <RecordList
        emptyDescription="Add billing or shipping addresses before using this customer in fulfilment workflows."
        emptyIcon={MapPin}
        emptyTitle="No addresses"
        items={addresses.map((address) => ({
          badges: [
            address.isDefaultBilling ? "Default billing" : null,
            address.isDefaultShipping ? "Default shipping" : null,
            address.type,
          ].filter(isString),
          description: address.addressLines.join(", "),
          meta: [address.city, address.region, address.countryCode]
            .filter(Boolean)
            .join(", "),
          title: address.label,
        }))}
      />
      <PermissionGate permission="customers.manage">
        <CatalogFormCard
          description="Capture one address that can be reused for billing, delivery, or both."
          title="Add address"
        >
          <CustomerAddressForm
            error={error}
            isPending={isPending}
            onSubmit={onAddAddress}
          />
        </CatalogFormCard>
      </PermissionGate>
    </div>
  );
}

export function TimelinePanel({
  events,
}: {
  events: AdminCustomerDetail["events"];
}) {
  if (events.length === 0) {
    return (
      <AppEmptyState
        description="Customer creation, profile updates, contacts, addresses, and future document events will appear here."
        icon={History}
        kind="no-data"
        title="No timeline events"
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-none">
      {events.map((event, index) => (
        <div
          className={cn(
            "flex flex-col gap-1 p-4",
            index !== events.length - 1 && "border-b border-border/60",
          )}
          key={`${event.eventType}-${event.occurredAt}-${event.summary}`}
        >
          <p className="font-semibold text-foreground">{event.summary}</p>
          <p className="type-support text-muted-foreground">
            {event.eventType.replaceAll("_", " ")} |{" "}
            {formatDateTime(event.occurredAt, { empty: "Date unavailable" })}
          </p>
        </div>
      ))}
    </div>
  );
}

function RecordList({
  emptyDescription,
  emptyIcon,
  emptyTitle,
  items,
}: {
  emptyDescription: string;
  emptyIcon: typeof Building2;
  emptyTitle: string;
  items: Array<{
    badges: string[];
    description: string;
    meta: string;
    title: string;
  }>;
}) {
  if (items.length === 0) {
    return (
      <AppEmptyState
        description={emptyDescription}
        icon={emptyIcon}
        kind="no-data"
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div
          className="rounded-xl border border-border/70 bg-card p-4 shadow-none"
          key={`${item.title}-${item.description}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="type-support break-words text-muted-foreground">
                {item.description}
              </p>
              {item.meta ? (
                <p className="type-support mt-1 text-muted-foreground">
                  {item.meta}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {item.badges.map((badge) => (
                <Badge key={badge} variant="outline">
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function isString(value: string | null): value is string {
  return value !== null;
}
