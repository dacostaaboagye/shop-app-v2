"use client";

import type { AdminSupplierDetail, AdminUserSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { AppFormField } from "@/components/forms/app-form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  emailRecipientStateQueryKey,
  fetchEmailRecipientState,
} from "@/lib/react-query/official-documents";

export function SupplierContactPortalAccess(props: {
  contactEmail: string | null;
  disabled: boolean;
  hasContactEmail: boolean;
  isPending: boolean;
  onInvite: () => void;
  onLink: () => void;
  onUserChange: (value: string) => void;
  portalStatus: AdminSupplierDetail["contacts"][number]["portalStatus"];
  selectId: string;
  selectedUserSlug: string;
  userOptions: AdminUserSummary[];
}) {
  const normalizedEmail = props.contactEmail?.trim().toLowerCase() ?? "";
  const recipientStateQuery = useQuery({
    enabled: normalizedEmail !== "",
    queryFn: () => fetchEmailRecipientState(normalizedEmail),
    queryKey: emailRecipientStateQueryKey(normalizedEmail),
  });
  const inviteBlocked = recipientStateQuery.data?.canSend === false;

  return (
    <AppFormField
      description="Link an existing portal user or invite this contact to activate supplier access."
      inputId={props.selectId}
      label="Portal account"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:min-w-72">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row">
          <Select
            disabled={props.disabled}
            onValueChange={props.onUserChange}
            value={props.selectedUserSlug}
          >
            <SelectTrigger
              className="min-w-0 flex-1 bg-muted/20"
              id={props.selectId}
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
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={props.disabled || !props.selectedUserSlug}
              onClick={props.onLink}
              size="sm"
              type="button"
            >
              Link
            </Button>
            <Button
              disabled={
                props.isPending ||
                !props.hasContactEmail ||
                props.portalStatus === "inactive" ||
                inviteBlocked
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
      </div>
      {recipientStateQuery.data && !recipientStateQuery.data.canSend ? (
        <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="destructive">
              {formatBlockedStatus(recipientStateQuery.data.status)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Invite blocked for this address
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {recipientStateQuery.data.summary}
          </p>
          {recipientStateQuery.data.statusReason ? (
            <p className="text-xs text-muted-foreground">
              {recipientStateQuery.data.statusReason}
            </p>
          ) : null}
        </div>
      ) : null}
    </AppFormField>
  );
}

function formatBlockedStatus(status: string | null) {
  switch (status) {
    case "bounced":
      return "Bounced";
    case "complained":
      return "Complained";
    case "suppressed":
      return "Suppressed";
    default:
      return "Blocked";
  }
}
