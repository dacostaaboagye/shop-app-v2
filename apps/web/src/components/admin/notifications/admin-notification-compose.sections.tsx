"use client";

import type { AdminStaffRoleFilter, AdminUserSummary } from "@shop/contracts";
import { BellRing, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ADMIN_NOTIFICATION_AUDIENCE_OPTIONS,
  ADMIN_NOTIFICATION_TARGET_OPTIONS,
} from "./admin-notification-compose.support";

type LocationScopeOption = {
  locationId: string;
  locationName: string;
};

export function AdminNotificationTargetSection(props: {
  audienceId: string;
  audiencePermission: string;
  locationId: string;
  locationOptions: LocationScopeOption[];
  locationScopeId: string;
  recipientId: string;
  recipientRole: AdminStaffRoleFilter;
  recipientRoleId: string;
  recipientSearch: string;
  recipientSearchId: string;
  recipientSlug: string;
  selectedRecipient: AdminUserSummary | null;
  setAudiencePermission: (value: string) => void;
  setLocationScopeId: (value: string) => void;
  setRecipientRole: (value: AdminStaffRoleFilter) => void;
  setRecipientSearch: (value: string) => void;
  setRecipientSlug: (value: string) => void;
  staffItems: AdminUserSummary[];
  staffPending: boolean;
  targetId: string;
  targetKind: "audience" | "user";
  setTargetKind: (value: "audience" | "user") => void;
}) {
  const selectedAudience =
    ADMIN_NOTIFICATION_AUDIENCE_OPTIONS.find(
      (option) => option.permission === props.audiencePermission,
    ) ?? null;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={props.targetId}>Target</Label>
        <Select
          value={props.targetKind}
          onValueChange={(value) =>
            props.setTargetKind(value as "audience" | "user")
          }
        >
          <SelectTrigger id={props.targetId}>
            <SelectValue placeholder="Choose target mode" />
          </SelectTrigger>
          <SelectContent>
            {ADMIN_NOTIFICATION_TARGET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="type-support">
          {
            ADMIN_NOTIFICATION_TARGET_OPTIONS.find(
              (option) => option.value === props.targetKind,
            )?.description
          }
        </p>
      </div>

      {props.targetKind === "audience" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={props.audienceId}>Audience</Label>
            <Select
              value={props.audiencePermission}
              onValueChange={props.setAudiencePermission}
            >
              <SelectTrigger id={props.audienceId}>
                <SelectValue placeholder="Choose audience" />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_NOTIFICATION_AUDIENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.permission} value={option.permission}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAudience ? (
              <p className="type-support">{selectedAudience.description}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={props.locationId}>Location Scope</Label>
            <Select
              value={props.locationScopeId}
              onValueChange={props.setLocationScopeId}
            >
              <SelectTrigger id={props.locationId}>
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Locations</SelectItem>
                {props.locationOptions.map((option) => (
                  <SelectItem key={option.locationId} value={option.locationId}>
                    {option.locationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="type-support">
              Leave this global to target all recipients who hold the selected
              permission.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={props.recipientRoleId}>Staff Role</Label>
              <Select
                value={props.recipientRole}
                onValueChange={(value) =>
                  props.setRecipientRole(value as AdminStaffRoleFilter)
                }
              >
                <SelectTrigger id={props.recipientRoleId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Workers</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                  <SelectItem value="all">Managers and Workers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={props.recipientSearchId}>Search Staff</Label>
              <Input
                id={props.recipientSearchId}
                placeholder="Search by name or email"
                value={props.recipientSearch}
                onChange={(event) =>
                  props.setRecipientSearch(event.target.value)
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={props.recipientId}>Recipient</Label>
            <Select
              value={props.recipientSlug}
              onValueChange={props.setRecipientSlug}
            >
              <SelectTrigger id={props.recipientId}>
                <SelectValue placeholder="Choose a staff member" />
              </SelectTrigger>
              <SelectContent>
                {props.staffItems.map((staff) => (
                  <SelectItem key={staff.slug} value={staff.slug}>
                    {formatRecipientLabel(staff)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="type-support">
              {props.staffPending
                ? "Loading active staff."
                : props.selectedRecipient
                  ? `${props.selectedRecipient.email}`
                  : "Select one active manager or worker for a direct message."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function AdminNotificationChannelSection(props: {
  emailChannelId: string;
  notificationChannelId: string;
  sendEmail: boolean;
  sendNotification: boolean;
  setSendEmail: (value: boolean) => void;
  setSendNotification: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-4 py-3">
        <Switch
          checked={props.sendNotification}
          id={props.notificationChannelId}
          onCheckedChange={props.setSendNotification}
        />
        <span className="min-w-0">
          <Label
            className="flex items-center gap-2 text-sm font-medium text-foreground"
            htmlFor={props.notificationChannelId}
          >
            <BellRing className="size-4" />
            In-App Notification
          </Label>
          <span className="type-support mt-1 block">
            Deliver this update through the notification center.
          </span>
        </span>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-4 py-3">
        <Switch
          checked={props.sendEmail}
          id={props.emailChannelId}
          onCheckedChange={props.setSendEmail}
        />
        <span className="min-w-0">
          <Label
            className="flex items-center gap-2 text-sm font-medium text-foreground"
            htmlFor={props.emailChannelId}
          >
            <Mail className="size-4" />
            Email
          </Label>
          <span className="type-support mt-1 block">
            Send the same update through the governed messaging runtime.
          </span>
        </span>
      </div>
    </div>
  );
}

function formatRecipientLabel(staff: AdminUserSummary) {
  return `${staff.firstName} ${staff.lastName} - ${staff.email}`;
}
