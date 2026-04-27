"use client";

import type { PortalKey } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { Bell, UserRound, UserRoundPen } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiError } from "@/lib/react-query/query-client";
import {
  AccountIdentityCard,
  PreferenceRow,
  portalLabels,
} from "./portal-account-dialog.sections";

export type AccountWorkspaceUser = {
  availablePortals: PortalKey[];
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastLoginAt: string | null;
  lastName: string;
  notificationPreferences: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    soundEnabled: boolean;
  };
  primaryImageUrl: string | null | undefined;
  preferredPortal: PortalKey | null;
  slug: string;
  status: string;
};

export function AccountWorkspaceIdentity({
  user,
}: {
  user: AccountWorkspaceUser;
}) {
  return <AccountIdentityCard user={user} />;
}

export function AccountWorkspaceProfileEditor({
  error,
  isPending,
  onSubmit,
  user,
}: {
  error?: ApiError | null;
  isPending: boolean;
  onSubmit: (values: { firstName: string; lastName: string }) => void;
  user: AccountWorkspaceUser;
}) {
  const form = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
    },
    onSubmit: async ({ value }) => {
      onSubmit({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
      });
    },
  });

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <UserRoundPen className="mt-0.5 size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">Profile</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the personal identity details shown across your workspace.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Profile Update Failed</AlertTitle>
                <AlertDescription>
                  {error.problem?.detail ??
                    "We could not save your profile right now."}
                </AlertDescription>
              </Alert>
            ) : null}
            <form
              className="flex flex-col gap-5"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <form.Field
                  name="firstName"
                  validators={{
                    onSubmit: ({ value }) =>
                      value.trim() ? undefined : "Enter first name.",
                  }}
                >
                  {(field) => (
                    <AppFormField
                      errors={field.state.meta.errors}
                      inputId={field.name}
                      label="First Name"
                    >
                      <Input
                        id={field.name}
                        maxLength={120}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        value={field.state.value}
                      />
                    </AppFormField>
                  )}
                </form.Field>
                <form.Field
                  name="lastName"
                  validators={{
                    onSubmit: ({ value }) =>
                      value.trim() ? undefined : "Enter last name.",
                  }}
                >
                  {(field) => (
                    <AppFormField
                      errors={field.state.meta.errors}
                      inputId={field.name}
                      label="Last Name"
                    >
                      <Input
                        id={field.name}
                        maxLength={120}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        value={field.state.value}
                      />
                    </AppFormField>
                  )}
                </form.Field>
                <AppFormField
                  description={
                    user.emailVerified
                      ? "This email is already verified."
                      : "This email is pending verification."
                  }
                  inputId="account-email"
                  label="Email"
                >
                  <Input id="account-email" readOnly value={user.email} />
                </AppFormField>
              </FieldGroup>
              <div className="flex justify-end">
                <Button
                  disabled={isPending || !form.state.isDirty}
                  type="submit"
                >
                  {isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AccountWorkspacePreferences({
  preferredPortal,
  user,
  onPreferredPortalChange,
}: {
  preferredPortal: PortalKey | "";
  user: AccountWorkspaceUser;
  onPreferredPortalChange: (value: PortalKey | "") => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <UserRound className="mt-0.5 size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">Workspace</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the portal that should open first after sign-in.
          </p>
          <div className="mt-3 max-w-sm">
            <Select
              value={preferredPortal}
              onValueChange={(value) =>
                onPreferredPortalChange(
                  (value as PortalKey | "__none__") === "__none__"
                    ? ""
                    : (value as PortalKey),
                )
              }
            >
              <SelectTrigger id="account-preferred-portal">
                <SelectValue placeholder="Use session default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Use Session Default</SelectItem>
                {user.availablePortals.map((portal) => (
                  <SelectItem key={portal} value={portal}>
                    {portalLabels[portal]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AccountWorkspaceNotificationSettings({
  emailEnabled,
  inAppEnabled,
  soundEnabled,
  onEmailEnabledChange,
  onInAppEnabledChange,
  onSoundEnabledChange,
}: {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  soundEnabled: boolean;
  onEmailEnabledChange: (checked: boolean) => void;
  onInAppEnabledChange: (checked: boolean) => void;
  onSoundEnabledChange: (checked: boolean) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">Notifications</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Control email delivery, in-app delivery, and notification sound for
            your account.
          </p>
          <div className="mt-4 grid gap-3">
            <PreferenceRow
              checked={inAppEnabled}
              description="Receive operational updates in the app notification center."
              id="account-in-app-enabled"
              label="In-App Notifications"
              onCheckedChange={onInAppEnabledChange}
            />
            <PreferenceRow
              checked={emailEnabled}
              description="Receive eligible operational updates by email."
              id="account-email-enabled"
              label="Email Notifications"
              onCheckedChange={onEmailEnabledChange}
            />
            <PreferenceRow
              checked={soundEnabled}
              description="Play a short sound when new in-app notifications arrive during an active session."
              disabled={!inAppEnabled}
              id="account-sound-enabled"
              label="Notification Sound"
              onCheckedChange={onSoundEnabledChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
