"use client";

import type {
  AdminCreateSupplierContactRequest,
  AdminSupplierDetail,
} from "@shop/contracts";
import { UsersRound } from "lucide-react";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactsPanel(props: {
  contacts: AdminSupplierDetail["contacts"];
  isPending: boolean;
  onAddContact: (input: AdminCreateSupplierContactRequest) => void;
  onRemoveContact: (contactReference: string) => void;
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
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2">
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
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              checked={contact.isPrimary}
              onChange={(event) =>
                setContact((v) => ({ ...v, isPrimary: event.target.checked }))
              }
              type="checkbox"
            />
            Primary supplier contact
          </label>
        </div>
        <Button
          disabled={!contact.firstName || !contact.lastName || props.isPending}
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
        {props.contacts.length === 0 ? (
          <AppEmptyState
            description="Add procurement, finance, delivery, and portal contacts."
            icon={UsersRound}
            kind="no-data"
            title="No contacts"
          />
        ) : (
          props.contacts.map((item) => (
            <ContactRow
              contact={item}
              key={`${item.firstName}-${item.lastName}-${item.email ?? item.phone ?? "contact"}`}
              onRemove={props.onRemoveContact}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ContactRow({
  contact,
  onRemove,
}: {
  contact: AdminSupplierDetail["contacts"][number];
  onRemove: (contactReference: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <p className="font-medium">
          {contact.firstName} {contact.lastName}
        </p>
        <p className="text-sm text-muted-foreground">
          {contact.jobTitle ??
            contact.email ??
            contact.phone ??
            "No contact detail"}
        </p>
      </div>
      <div className="flex gap-2">
        {contact.isPrimary ? <Badge>Primary</Badge> : null}
        {contact.userSlug ? <Badge variant="secondary">Portal</Badge> : null}
        {!contact.isPrimary ? (
          <Button
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

function TextInput(props: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{props.label}</Label>
      <Input
        onChange={(event) => props.onChange(event.target.value)}
        value={props.value}
      />
    </div>
  );
}
