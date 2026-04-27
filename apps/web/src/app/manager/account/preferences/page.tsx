import { AccountManagementWorkspace } from "@/components/system/account-management-workspace";

export default function ManagerAccountPreferencesPage() {
  return (
    <AccountManagementWorkspace
      description="Manage your default workspace and notification delivery preferences."
      section="preferences"
      title="Preferences"
    />
  );
}
