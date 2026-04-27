"use client";

import type { AdminStaffRoleFilter } from "@shop/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppDialog, AppDialogBody } from "@/components/system/app-dialog";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { fetchAdminStaff } from "@/lib/react-query/admin-directory";
import { postAdminNotificationCompose } from "@/lib/react-query/notifications";
import {
  AdminNotificationChannelSection,
  AdminNotificationTargetSection,
} from "./admin-notification-compose.sections";
import { ADMIN_NOTIFICATION_AUDIENCE_OPTIONS } from "./admin-notification-compose.support";

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
          <AdminNotificationTargetSection
            audienceId={audienceId}
            audiencePermission={audiencePermission}
            locationId={locationId}
            locationOptions={locationOptions}
            locationScopeId={locationScopeId}
            recipientId={recipientId}
            recipientRole={recipientRole}
            recipientRoleId={recipientRoleId}
            recipientSearch={recipientSearch}
            recipientSearchId={recipientSearchId}
            recipientSlug={recipientSlug}
            selectedRecipient={selectedRecipient}
            setAudiencePermission={setAudiencePermission}
            setLocationScopeId={setLocationScopeId}
            setRecipientRole={setRecipientRole}
            setRecipientSearch={setRecipientSearch}
            setRecipientSlug={setRecipientSlug}
            setTargetKind={setTargetKind}
            staffItems={staffItems}
            staffPending={staffQuery.isPending}
            targetId={targetId}
            targetKind={targetKind}
          />

          <AdminNotificationChannelSection
            emailChannelId={emailChannelId}
            notificationChannelId={notificationChannelId}
            sendEmail={sendEmail}
            sendNotification={sendNotification}
            setSendEmail={setSendEmail}
            setSendNotification={setSendNotification}
          />

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
