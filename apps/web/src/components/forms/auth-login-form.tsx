"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { getGoogleOAuthUrl, login } from "@/lib/auth/auth-client";
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
      <a
        href={getGoogleOAuthUrl()}
        className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </a>

      <div className="relative flex items-center gap-2">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <form
        className="flex flex-col gap-4"
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
              // only validate on blur if the user has typed something
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
                  onChange={(e) => field.handleChange(e.target.value)}
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter your password"
                  value={field.state.value}
                />
              </AppFormField>
            )}
          </form.Field>
        </FieldGroup>

        <div className="flex justify-end -mt-1">
          <Link
            href={toRoute("/forgot-password")}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {authError ? (
          <Alert variant="destructive">
            <AlertTitle>{authError.title}</AlertTitle>
            <AlertDescription>{authError.detail}</AlertDescription>
          </Alert>
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
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <LogIn data-icon="inline-end" />
                </>
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        style={{ fill: "rgb(66,133,244)" }}
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        style={{ fill: "rgb(52,168,83)" }}
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        style={{ fill: "rgb(251,188,5)" }}
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        style={{ fill: "rgb(234,67,53)" }}
      />
    </svg>
  );
}

function validateEmail(value: string) {
  if (!value.trim()) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return "Enter a valid email address.";
  return undefined;
}

function validatePassword(value: string) {
  if (!value.trim()) return "Enter your password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return undefined;
}
