"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

const loginDefaults = {
  email: "",
  password: "",
};

function validateEmail(value: string) {
  if (!value.trim()) {
    return "Enter your email address.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(value)) {
    return "Enter a valid email address.";
  }

  return undefined;
}

function validatePassword(value: string) {
  if (!value.trim()) {
    return "Enter your password.";
  }

  if (value.length < 8) {
    return "Use at least 8 characters.";
  }

  return undefined;
}

export function LoginPreviewForm() {
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const form = useForm({
    defaultValues: loginDefaults,
    onSubmit: async ({ value }) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 120);
      });

      setSubmitMessage(
        `Preview submission captured for ${value.email}. The real flow will hand off to the identity service.`,
      );
    },
  });

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name="email"
          validators={{
            onBlur: ({ value }) => validateEmail(value),
            onSubmit: ({ value }) => validateEmail(value),
          }}
        >
          {(field) => (
            <AppFormField
              description="This preview uses TanStack Form with the shared field wrapper."
              errors={field.state.meta.errors}
              inputId={field.name}
              label="Email"
              showErrors={
                field.state.meta.isTouched || field.state.meta.isBlurred
              }
            >
              <Input
                autoComplete="email"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="name@company.com"
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>

        <form.Field
          name="password"
          validators={{
            onBlur: ({ value }) => validatePassword(value),
            onSubmit: ({ value }) => validatePassword(value),
          }}
        >
          {(field) => (
            <AppFormField
              errors={field.state.meta.errors}
              inputId={field.name}
              label="Password"
              showErrors={
                field.state.meta.isTouched || field.state.meta.isBlurred
              }
            >
              <Input
                autoComplete="current-password"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>
      </FieldGroup>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <div className="token-row">
            <Button
              disabled={!canSubmit || isSubmitting}
              size="lg"
              type="submit"
            >
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              Sign In
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="lg" type="button" variant="outline">
              Forgot Password
            </Button>
          </div>
        )}
      </form.Subscribe>

      {submitMessage ? (
        <>
          <Separator />
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Preview submission complete</AlertTitle>
            <AlertDescription>{submitMessage}</AlertDescription>
          </Alert>
        </>
      ) : null}
    </form>
  );
}
