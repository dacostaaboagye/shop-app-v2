"use client";

import type {
  AdminCreateSupplierContactRequest,
  AdminSupplierDetail,
  AdminUserSummary,
} from "@shop/contracts";
import { UsersRound } from "lucide-react";
import { useId, useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function ContactsPanel(props: {
  contacts: AdminSupplierDetail["contacts"];
  isPending: boolean;
  onAddContact: (input: AdminCreateSupplierContactRequest) => void;
  onInvitePortalUser: (contactReference: string) => void;
  onLinkPortalUser: (contactReference: string, userSlug: string) => void;
  onRemoveContact: (contactReference: string) => void;
  onUnlinkPortalUser: (contactReference: string) => void;
  userOptions: AdminUserSummary[];
}) {
  const [contact, setContact] = useState({
    email: "",
    firstName: "",
    isPrimary: props.contacts.length === 0,
    jobTitle: "",
    lastName: "",
    phone: "",
  });
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border/50 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
          Add new contact
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="First name"
            onChange={(firstName) => setContact((v) => ({ ...v, firstName }))}
            value={contact.firstName}
          />
          <TextInput
            label="Last name"
            onChange={(lastName) => setContact((v) => ({ ...v, lastName }))}
            value={contact.lastName}
          />
          <TextInput
            label="Email"
            onChange={(email) => setContact((v) => ({ ...v, email }))}
            value={contact.email}
          />
          <TextInput
            label="Phone"
            onChange={(phone) => setContact((v) => ({ ...v, phone }))}
            value={contact.phone}
          />
          <TextInput
            label="Job title"
            onChange={(jobTitle) => setContact((v) => ({ ...v, jobTitle }))}
            value={contact.jobTitle}
          />
          <div className="flex items-center gap-2 pt-8">
            <input
              checked={contact.isPrimary}
              className="size-4 rounded-md border-border/60 text-primary focus:ring-primary/20"
              id="is-primary-contact"
              onChange={(event) =>
                setContact((v) => ({ ...v, isPrimary: event.target.checked }))
              }
              type="checkbox"
            />
            <Label className="font-medium" htmlFor="is-primary-contact">
              Primary supplier contact
            </Label>
          </div>
        </div>
        <div className="flex justify-start">
          <Button
            className="h-11 rounded-xl px-8"
            disabled={
              !contact.firstName || !contact.lastName || props.isPending
            }
            onClick={() =>
              props.onAddContact({
                email: contact.email || null,
                firstName: contact.firstName,
                isPrimary: contact.isPrimary,
                jobTitle: contact.jobTitle || null,
                lastName: contact.lastName,
                phone: contact.phone || null,
                status: "active",
              })
            }
            size="sm"
            type="button"
          >
            Add contact
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
          Managed contacts
        </h3>
        {props.contacts.length === 0 ? (
          <AppEmptyState
            description="Add procurement, finance, delivery, and portal contacts."
            icon={UsersRound}
            kind="no-data"
            title="No contacts"
          />
        ) : (
          <AppTableWrapper>
            {props.contacts.map((item, index) => (
              <ContactRow
                contact={item}
                index={index}
                isPending={props.isPending}
                itemCount={props.contacts.length}
                key={`${item.firstName}-${item.lastName}-${item.email ?? item.phone ?? "contact"}`}
                onInvitePortalUser={props.onInvitePortalUser}
                onLinkPortalUser={props.onLinkPortalUser}
                onRemove={props.onRemoveContact}
                onUnlinkPortalUser={props.onUnlinkPortalUser}
                userOptions={props.userOptions}
              />
            ))}
          </AppTableWrapper>
        )}
      </div>
    </div>
  );
}

function ContactRow({
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
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between",
        index !== itemCount - 1 && "border-b border-border/50",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground">
            {contact.firstName} {contact.lastName}
          </p>
          {contact.isPrimary ? (
            <Badge
              className="rounded-md font-bold uppercase tracking-wider text-[10px]"
              variant="secondary"
            >
              Primary
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground/80">
          {contact.jobTitle ?? "No job title"}
        </p>
        {(contact.email || contact.phone) && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {contact.email && (
              <span className="underline decoration-border/50 underline-offset-2">
                {contact.email}
              </span>
            )}
            {contact.phone && <span>{contact.phone}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {contact.userSlug ? (
          <div className="flex items-center gap-2 bg-muted/20 p-2 rounded-xl border border-border/50">
            <div className="px-2">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                Portal User
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium">{contact.userSlug}</p>
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
          <PortalUserLinkField
            disabled={
              isPending ||
              userOptions.length === 0 ||
              contact.portalStatus === "inactive"
            }
            hasContactEmail={Boolean(contact.email)}
            isPending={isPending}
            portalStatus={contact.portalStatus}
            onInvite={() => onInvitePortalUser(contact.contactReference)}
            onLink={() =>
              onLinkPortalUser(contact.contactReference, selectedUserSlug)
            }
            onUserChange={setSelectedUserSlug}
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
    </div>
  );
}

function PortalUserLinkField(props: {
  disabled: boolean;
  hasContactEmail: boolean;
  isPending: boolean;
  onInvite: () => void;
  onLink: () => void;
  onUserChange: (value: string) => void;
  portalStatus: AdminSupplierDetail["contacts"][number]["portalStatus"];
  selectedUserSlug: string;
  userOptions: AdminUserSummary[];
}) {
  const selectId = useId();
  return (
    <div className="flex flex-col gap-1.5 sm:min-w-72">
      <Label
        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
        htmlFor={selectId}
      >
        Portal account
      </Label>
      <div className="flex gap-2">
        <Select
          disabled={props.disabled}
          onValueChange={props.onUserChange}
          value={props.selectedUserSlug}
        >
          <SelectTrigger
            className="h-10 rounded-xl border-border/60 bg-muted/20"
            id={selectId}
          >
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            {props.userOptions.map((user) => (
              <SelectItem key={user.slug} value={user.slug}>
                {user.firstName} {user.lastName} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="h-10 rounded-xl"
          disabled={props.disabled || !props.selectedUserSlug}
          onClick={props.onLink}
          size="sm"
          type="button"
        >
          Link
        </Button>
        <Button
          className="h-10 rounded-xl"
          disabled={
            props.isPending ||
            !props.hasContactEmail ||
            props.portalStatus === "inactive"
          }
          onClick={props.onInvite}
          size="sm"
          type="button"
          variant="outline"
        >
          {props.portalStatus === "invited" ? "Resend invite" : "Invite"}
        </Button>
      </div>
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

function TextInput(props: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {props.label}
      </Label>
      <Input
        className="h-10 rounded-xl border-border/60 bg-muted/20 transition-all focus:bg-background focus:ring-primary/20"
        onChange={(event) => props.onChange(event.target.value)}
        value={props.value}
      />
    </div>
  );
}
