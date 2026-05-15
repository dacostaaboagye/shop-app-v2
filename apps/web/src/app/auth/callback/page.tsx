import { redirect } from "next/navigation";
import { toRoute } from "@/lib/routes";

export default function AuthCallbackPage() {
  redirect(toRoute("/login"));
}
