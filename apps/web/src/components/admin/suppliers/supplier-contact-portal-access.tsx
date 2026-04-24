"use client";

import type { AdminSupplierDetail, AdminUserSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
    <div className="flex flex-col gap-1.5 sm:min-w-72">
      <Label
        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
        htmlFor={props.selectId}
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
      {recipientStateQuery.data && !recipientStateQuery.data.canSend ? (
        <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background px-3 py-2">
          <div className="flex items-center gap-2">
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
    </div>
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
