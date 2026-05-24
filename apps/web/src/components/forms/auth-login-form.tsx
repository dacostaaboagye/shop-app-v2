"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { login } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/auth-messages";
import {
  currentUserPermissionsQueryKeyPrefix,
  currentUserQueryKey,
} from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";

const loginDefaults = { email: "", password: "" };

export function AuthLoginForm() {
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess(session) {
      queryClient.setQueryData(currentUserQueryKey, session.user);
      queryClient.removeQueries({
        queryKey: currentUserPermissionsQueryKeyPrefix,
      });
    },
  });

  const authError = loginMutation.error
    ? getAuthErrorMessage(loginMutation.error)
    : null;

  const form = useForm({
    defaultValues: loginDefaults,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      await loginMutation.mutateAsync(value);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-4"
        method="post"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setWasSubmitted(true);
          void form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field
            name="email"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? validateEmail(value) : undefined,
              onSubmit: ({ value }) => validateEmail(value),
            }}
          >
            {(field) => (
              <AppFormField
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Email"
                showErrors={
                  (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                  wasSubmitted
                }
              >
                <Input
                  autoComplete="email"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="name@company.com"
                  type="email"
                  value={field.state.value}
                />
              </AppFormField>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? validatePassword(value) : undefined,
              onSubmit: ({ value }) => validatePassword(value),
            }}
          >
            {(field) => (
              <AppFormField
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Password"
                showErrors={
                  (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                  wasSubmitted
                }
              >
                <PasswordInput
                  autoComplete="current-password"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Enter your password"
                  value={field.state.value}
                />
              </AppFormField>
            )}
          </form.Field>
        </FieldGroup>

        <div className="flex justify-end -mt-1">
          <Link
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href={toRoute("/forgot-password")}
          >
            Forgot password?
          </Link>
        </div>

        {authError ? (
          <AppErrorBanner
            detail={authError.detail}
            error={loginMutation.error}
            title={authError.title}
          />
        ) : null}

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              className="w-full"
              disabled={!canSubmit || isSubmitting}
              size="lg"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <LogIn className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}

function validateEmail(value: string) {
  if (!value.trim()) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Enter a valid email address.";
  }
  return undefined;
}

function validatePassword(value: string) {
  if (!value.trim()) return "Enter your password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return undefined;
}
