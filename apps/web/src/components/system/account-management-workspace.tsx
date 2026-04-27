"use client";

import type { PortalKey, UpdateProfileRequest } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Mail, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AccountProfileImagePanel } from "@/components/system/account-profile-image-panel";
import { AccountSecurityPanel } from "@/components/system/account-security-panel";
import { AppErrorBanner } from "@/components/system/app-error";
import { LogoutConfirmDialog } from "@/components/system/logout-confirm-dialog";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { logout } from "@/lib/auth/auth-client";
import {
  authQueryKey,
  currentUserQueryKey,
  fetchCurrentUser,
  updateCurrentUserProfile,
} from "@/lib/react-query/auth";
import { ApiError } from "@/lib/react-query/query-client";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import {
  AccountWorkspaceIdentity,
  AccountWorkspaceNotificationSettings,
  AccountWorkspacePreferences,
  AccountWorkspaceProfileEditor,
} from "./account-management-workspace.sections";

type AccountManagementWorkspaceProps = {
  description: string;
  section?: "preferences" | "profile";
  title: string;
};

export function AccountManagementWorkspace({
  description,
  section = "profile",
  title,
}: AccountManagementWorkspaceProps) {
  const queryClient = useQueryClient();
  const setUser = useAuthSessionStore((state) => state.setUser);
  const user = useAuthSessionStore((state) => state.user);
  const [preferredPortal, setPreferredPortal] = useState<PortalKey | "">("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setPreferredPortal(user.preferredPortal ?? "");
    setEmailEnabled(user.notificationPreferences.emailEnabled);
    setInAppEnabled(user.notificationPreferences.inAppEnabled);
    setSoundEnabled(user.notificationPreferences.soundEnabled);
  }, [user]);

  const hasPreferenceChanges = useMemo(() => {
    if (!user) {
      return false;
    }

    return (
      preferredPortal !== (user.preferredPortal ?? "") ||
      emailEnabled !== user.notificationPreferences.emailEnabled ||
      inAppEnabled !== user.notificationPreferences.inAppEnabled ||
      soundEnabled !== user.notificationPreferences.soundEnabled
    );
  }, [emailEnabled, inAppEnabled, preferredPortal, soundEnabled, user]);

  const updateMutation = useMutation({
    mutationFn: async (profile: UpdateProfileRequest) => {
      await updateCurrentUserProfile(profile);
      return fetchCurrentUser();
    },
    onSuccess(nextUser) {
      setUser(nextUser);
      void queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess() {
      queryClient.removeQueries({ queryKey: authQueryKey });
    },
  });

  const savePreferences = async () => {
    if (!user) {
      return;
    }

    await updateMutation.mutateAsync({
      notificationPreferences: {
        emailEnabled,
        inAppEnabled,
        soundEnabled,
      },
      preferredPortal: preferredPortal || null,
    });
  };

  const saveIdentityProfile = async (values: {
    firstName: string;
    lastName: string;
  }) => {
    await updateMutation.mutateAsync(values);
  };

  const refreshCurrentUser = async () => {
    const nextUser = await fetchCurrentUser();
    setUser(nextUser);
    await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
  };

  if (!user) {
    return (
      <PageShell>
        <PageHeader description={description} title={title} />
        <AppErrorBanner title="Account session is unavailable" />
      </PageShell>
    );
  }

  const showProfile = section === "profile";
  const showPreferences = section === "preferences";
  const workspaceUser = {
    ...user,
    primaryImageUrl: user.primaryImageUrl ?? null,
  };

  return (
    <PageShell>
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={logoutMutation.isPending || updateMutation.isPending}
              onClick={() => setLogoutDialogOpen(true)}
              type="button"
              variant="outline"
            >
              <LogOut data-icon="inline-start" />
              Sign Out
            </Button>
            {showPreferences ? (
              <Button
                disabled={
                  !hasPreferenceChanges ||
                  logoutMutation.isPending ||
                  updateMutation.isPending
                }
                onClick={() => void savePreferences()}
                type="button"
              >
                {updateMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                Save Preferences
                <Mail data-icon="inline-end" />
              </Button>
            ) : null}
          </div>
        }
        description={description}
        title={title}
      />

      {showPreferences ? (
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            description="Email delivery preference for your account."
            icon={Mail}
            label="Email"
            value={emailEnabled ? "Enabled" : "Disabled"}
          />
          <StatCard
            description="In-app notification delivery preference."
            icon={Bell}
            label="In-App"
            value={inAppEnabled ? "Enabled" : "Disabled"}
          />
          <StatCard
            description="Live notification sound during active sessions."
            icon={UserRound}
            label="Sound"
            value={soundEnabled ? "Enabled" : "Disabled"}
          />
        </section>
      ) : null}

      {showProfile ? (
        <div className="flex flex-col gap-4">
          <AccountProfileImagePanel
            firstName={workspaceUser.firstName}
            imageUrl={workspaceUser.primaryImageUrl}
            lastName={workspaceUser.lastName}
            onProfileChanged={refreshCurrentUser}
          />
          <AccountWorkspaceProfileEditor
            key={`${user.slug}:${user.firstName}:${user.lastName}`}
            error={
              updateMutation.error instanceof ApiError
                ? updateMutation.error
                : null
            }
            isPending={updateMutation.isPending}
            onSubmit={(values) => void saveIdentityProfile(values)}
            user={workspaceUser}
          />
          <AccountSecurityPanel
            email={workspaceUser.email}
            hasPassword={workspaceUser.hasPassword !== false}
          />
          <AccountWorkspaceIdentity user={workspaceUser} />
        </div>
      ) : null}

      {showPreferences ? (
        <AccountWorkspacePreferences
          preferredPortal={preferredPortal}
          user={workspaceUser}
          onPreferredPortalChange={setPreferredPortal}
        />
      ) : null}

      {showPreferences ? (
        <AccountWorkspaceNotificationSettings
          emailEnabled={emailEnabled}
          inAppEnabled={inAppEnabled}
          soundEnabled={soundEnabled}
          onEmailEnabledChange={setEmailEnabled}
          onInAppEnabledChange={setInAppEnabled}
          onSoundEnabledChange={setSoundEnabled}
        />
      ) : null}

      {showPreferences && updateMutation.error instanceof ApiError ? (
        <Alert variant="destructive">
          <AlertTitle>Account Update Failed</AlertTitle>
          <AlertDescription>
            {updateMutation.error.problem?.detail ??
              "We could not save your account preferences right now."}
          </AlertDescription>
        </Alert>
      ) : null}

      <LogoutConfirmDialog
        isPending={logoutMutation.isPending}
        onConfirm={() => void logoutMutation.mutateAsync()}
        onOpenChange={setLogoutDialogOpen}
        open={logoutDialogOpen}
      />
    </PageShell>
  );
}
