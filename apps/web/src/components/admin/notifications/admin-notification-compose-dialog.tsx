"use client";

import type { AdminStaffRoleFilter, AdminUserSummary } from "@shop/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BellRing, Mail } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppDialog, AppDialogBody } from "@/components/system/app-dialog";
import { AppErrorBanner } from "@/components/system/app-error";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { fetchAdminStaff } from "@/lib/react-query/admin-directory";
import { postAdminNotificationCompose } from "@/lib/react-query/notifications";
import {
  ADMIN_NOTIFICATION_AUDIENCE_OPTIONS,
  ADMIN_NOTIFICATION_TARGET_OPTIONS,
} from "./admin-notification-compose.support";

type LocationScopeOption = {
  locationId: string;
  locationName: string;
};

export function AdminNotificationComposeDialog({
  locationOptions,
  onOpenChange,
  open,
}: {
  locationOptions: LocationScopeOption[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const audienceId = useId();
  const targetId = useId();
  const locationId = useId();
  const recipientId = useId();
  const recipientSearchId = useId();
  const recipientRoleId = useId();
  const subjectId = useId();
  const messageId = useId();
  const notificationChannelId = useId();
  const emailChannelId = useId();
  const [audiencePermission, setAudiencePermission] = useState<string>(
    ADMIN_NOTIFICATION_AUDIENCE_OPTIONS[0]?.permission ?? "",
  );
  const [locationScopeId, setLocationScopeId] = useState("__all__");
  const [messageBody, setMessageBody] = useState("");
  const [recipientRole, setRecipientRole] =
    useState<AdminStaffRoleFilter>("worker");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientSlug, setRecipientSlug] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [subject, setSubject] = useState("");
  const [targetKind, setTargetKind] = useState<"audience" | "user">("audience");

  const staffQuery = useQuery({
    enabled: open && targetKind === "user",
    queryFn: () =>
      fetchAdminStaff({
        locationSlug: "",
        page: 1,
        pageSize: 50,
        q: recipientSearch,
        role: recipientRole,
        sort: "name",
        status: "active",
        dir: "asc",
      }),
    queryKey: [
      "admin",
      "notifications",
      "recipient-staff",
      { q: recipientSearch, role: recipientRole },
    ],
  });

  const mutation = useMutation({
    mutationFn: postAdminNotificationCompose,
    onSuccess(data) {
      const deliveredChannels = [
        data.notificationRecipientCount > 0 ? "in-app" : null,
        data.emailRecipientCount > 0 ? "email" : null,
      ].filter(Boolean);

      toast.success(
        `${data.totalRecipientCount} recipients queued${deliveredChannels.length ? ` via ${deliveredChannels.join(" and ")}` : ""}.`,
      );
      setMessageBody("");
      setSendEmail(false);
      setSendNotification(true);
      setSubject("");
      setRecipientSearch("");
      setRecipientSlug("");
      setRecipientRole("worker");
      setTargetKind("audience");
      setLocationScopeId("__all__");
      onOpenChange(false);
    },
  });

  const selectedAudience = useMemo(
    () =>
      ADMIN_NOTIFICATION_AUDIENCE_OPTIONS.find(
        (option) => option.permission === audiencePermission,
      ) ?? null,
    [audiencePermission],
  );
  const staffItems = staffQuery.data?.items ?? [];
  const selectedRecipient = useMemo(
    () => staffItems.find((item) => item.slug === recipientSlug) ?? null,
    [recipientSlug, staffItems],
  );

  const submitDisabled =
    mutation.isPending ||
    subject.trim() === "" ||
    messageBody.trim() === "" ||
    (targetKind === "user" && recipientSlug.trim() === "") ||
    (!sendEmail && !sendNotification);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitDisabled) {
      return;
    }

    mutation.mutate({
      messageBody: messageBody.trim(),
      sendEmail,
      sendNotification,
      subject: subject.trim(),
      target:
        targetKind === "audience"
          ? {
              audience: {
                ...(locationScopeId !== "__all__"
                  ? { locationId: locationScopeId }
                  : {}),
                permission: audiencePermission,
              },
              kind: "audience",
            }
          : {
              kind: "user",
              recipient: {
                userSlug: recipientSlug,
              },
            },
    });
  }

  return (
    <AppDialog
      description="Send a governed operational update to an audience resolved from portal permissions and optional location scope."
      onOpenChange={onOpenChange}
      open={open}
      size="lg"
      title="Compose Update"
    >
      <form onSubmit={handleSubmit}>
        <AppDialogBody className="gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={targetId}>Target</Label>
            <Select
              value={targetKind}
              onValueChange={(value) =>
                setTargetKind(value as "audience" | "user")
              }
            >
              <SelectTrigger id={targetId}>
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
                  (option) => option.value === targetKind,
                )?.description
              }
            </p>
          </div>

          {targetKind === "audience" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={audienceId}>Audience</Label>
                <Select
                  value={audiencePermission}
                  onValueChange={setAudiencePermission}
                >
                  <SelectTrigger id={audienceId}>
                    <SelectValue placeholder="Choose audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_NOTIFICATION_AUDIENCE_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.permission}
                        value={option.permission}
                      >
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
                <Label htmlFor={locationId}>Location Scope</Label>
                <Select
                  value={locationScopeId}
                  onValueChange={setLocationScopeId}
                >
                  <SelectTrigger id={locationId}>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Locations</SelectItem>
                    {locationOptions.map((option) => (
                      <SelectItem
                        key={option.locationId}
                        value={option.locationId}
                      >
                        {option.locationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="type-support">
                  Leave this global to target all recipients who hold the
                  selected permission.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={recipientRoleId}>Staff Role</Label>
                  <Select
                    value={recipientRole}
                    onValueChange={(value) =>
                      setRecipientRole(value as AdminStaffRoleFilter)
                    }
                  >
                    <SelectTrigger id={recipientRoleId}>
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
                  <Label htmlFor={recipientSearchId}>Search Staff</Label>
                  <Input
                    id={recipientSearchId}
                    placeholder="Search by name or email"
                    value={recipientSearch}
                    onChange={(event) => setRecipientSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={recipientId}>Recipient</Label>
                <Select value={recipientSlug} onValueChange={setRecipientSlug}>
                  <SelectTrigger id={recipientId}>
                    <SelectValue placeholder="Choose a staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffItems.map((staff) => (
                      <SelectItem key={staff.slug} value={staff.slug}>
                        {formatRecipientLabel(staff)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="type-support">
                  {staffQuery.isPending
                    ? "Loading active staff."
                    : selectedRecipient
                      ? `${selectedRecipient.email}`
                      : "Select one active manager or worker for a direct message."}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-4 py-3">
              <Switch
                checked={sendNotification}
                id={notificationChannelId}
                onCheckedChange={setSendNotification}
              />
              <span className="min-w-0">
                <Label
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                  htmlFor={notificationChannelId}
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
                checked={sendEmail}
                id={emailChannelId}
                onCheckedChange={setSendEmail}
              />
              <span className="min-w-0">
                <Label
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                  htmlFor={emailChannelId}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={subjectId}>Subject</Label>
            <Input
              id={subjectId}
              maxLength={160}
              placeholder="Inventory update for Store A"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={messageId}>Message</Label>
            <Textarea
              id={messageId}
              maxLength={4000}
              placeholder="Add the operational detail recipients need to act without opening another tool."
              rows={8}
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
            />
          </div>

          {mutation.isError ? (
            <AppErrorBanner
              detail={getAppErrorMessage(mutation.error, {
                fallbackDetail: "The update could not be queued.",
              })}
              title="Unable to send update"
            />
          ) : null}
        </AppDialogBody>

        <div className="flex flex-col-reverse gap-2 rounded-b-lg border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={submitDisabled} type="submit">
            {mutation.isPending ? "Sending..." : "Send Update"}
          </Button>
        </div>
      </form>
    </AppDialog>
  );
}

function formatRecipientLabel(staff: AdminUserSummary) {
  return `${staff.firstName} ${staff.lastName} - ${staff.email}`;
}
