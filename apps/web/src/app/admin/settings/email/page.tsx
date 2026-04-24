import { redirect } from "next/navigation";
import { toRoute } from "@/lib/routes";

export default function AdminEmailSettingsPage() {
  redirect(toRoute("/admin/settings/messaging/templates"));
}
