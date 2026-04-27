import { AccountManagementWorkspace } from "@/components/system/account-management-workspace";

export default function AdminAccountPage() {
  return (
    <AccountManagementWorkspace
      description="Review your account identity, session status, and current delivery settings."
      title="Profile"
    />
  );
}
