import { redirect } from "next/navigation";
import { toRoute } from "@/lib/routes";

export default function AdminMessagingSettingsOverviewPage() {
  redirect(toRoute("/admin/settings/messaging/templates"));
}
