import { NotificationCenterPageClient } from "@/components/system/notification-center-page-client";

export default function CustomerNotificationsPage() {
  return (
    <NotificationCenterPageClient
      description="View invoice, order, and account updates relevant to your customer account."
      title="Notifications"
    />
  );
}
