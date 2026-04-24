import { NotificationCenterPageClient } from "@/components/system/notification-center-page-client";

export default function ManagerNotificationsPage() {
  return (
    <NotificationCenterPageClient
      description="Updates affecting the locations you manage, including requests, stock movement, and exceptions."
      title="Notifications"
    />
  );
}
