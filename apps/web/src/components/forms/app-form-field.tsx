"use client";

import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getFormFieldMessages } from "@/lib/forms/field-errors";

type AppFormFieldProps = {
  children: ReactNode;
  description?: string | undefined;
  errors?: ReadonlyArray<unknown> | null;
  info?: string | undefined;
  inputId: string;
  label: string;
  showErrors?: boolean;
};

export function AppFormField({
  children,
  description,
  errors,
  info,
  inputId,
  label,
  showErrors = true,
}: AppFormFieldProps) {
  const messages = showErrors ? getFormFieldMessages(errors) : [];

  return (
    <TooltipProvider>
      <Field
        className="gap-2.5"
        data-invalid={messages.length ? true : undefined}
      >
        <div className="flex items-center gap-1.5">
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          {info && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    className="inline-flex cursor-help items-center text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary outline-none"
                    type="button"
                  >
                    <HelpCircle className="size-3.5" />
                    <span className="sr-only">Help</span>
                  </button>
                }
              />
              <TooltipContent className="max-w-64">{info}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <FieldContent className="gap-1.5">
          {children}
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          <FieldError errors={messages.map((message) => ({ message }))} />
        </FieldContent>
      </Field>
    </TooltipProvider>
  );
}
