"use client";

import type {
  AdminCreateSupplierContactRequest,
  AdminSupplierDetail,
  AdminUserSummary,
} from "@shop/contracts";
import { UsersRound } from "lucide-react";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SupplierContactRow } from "./supplier-contact-row";

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
              <SupplierContactRow
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
