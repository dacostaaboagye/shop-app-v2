import { redirect } from "next/navigation";
import { toRoute } from "@/lib/routes";

export default function RegisterPage() {
  redirect(toRoute("/login"));
}
