"use client";

import { MailPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { NotificationCenterPageClient } from "@/components/system/notification-center-page-client";
import { Button } from "@/components/ui/button";
import { AdminNotificationComposeDialog } from "./admin-notification-compose-dialog";
import { AdminSentCommunicationsPanel } from "./admin-sent-communications-panel";

export function AdminNotificationsPageClient() {
  const [composeOpen, setComposeOpen] = useState(false);
  const { locationScopes } = useAuthorization();

  const locationOptions = useMemo(
    () =>
      locationScopes
        .map((scope) => ({
          locationId: scope.locationId,
          locationName: scope.locationName,
        }))
        .sort((left, right) =>
          left.locationName.localeCompare(right.locationName),
        ),
    [locationScopes],
  );

  return (
    <>
      <NotificationCenterPageClient
        description="Platform-wide operational updates, approvals, exceptions, delivery events, and manual admin broadcasts."
        headerActionsExtra={
          <Button
            className="w-full xl:w-auto"
            onClick={() => setComposeOpen(true)}
            type="button"
          >
            <MailPlus data-icon="inline-start" />
            Compose Update
          </Button>
        }
        secondaryTabContent={<AdminSentCommunicationsPanel />}
        secondaryTabLabel="Sent"
        title="Notifications"
      />
      <AdminNotificationComposeDialog
        locationOptions={locationOptions}
        onOpenChange={setComposeOpen}
        open={composeOpen}
      />
    </>
  );
}
