import { redirect } from "next/navigation";
import { toRoute } from "@/lib/routes";

export default function AdminSupplyRequestsPage() {
  redirect(toRoute("/admin/transfers"));
}
