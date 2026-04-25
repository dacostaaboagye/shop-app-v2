"use client";

import type { AnyFieldApi, Updater } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { TimeZoneSelect } from "@/components/settings/document-setting-selects";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LocationDocumentSettingsFormValues } from "./location-document-settings-form.support";

type FieldRenderProps = Pick<
  AnyFieldApi,
  "handleBlur" | "handleChange" | "name" | "state"
> & {
  handleChange: (value: Updater<unknown>) => void;
};

type LocationDocumentSettingsFormApi = {
  Field: <TName extends keyof LocationDocumentSettingsFormValues>(props: {
    children: (field: FieldRenderProps) => ReactNode;
    name: TName;
  }) => ReactNode | Promise<ReactNode>;
};

export function LocationProfileFields({
  form,
}: {
  form: LocationDocumentSettingsFormApi;
}) {
  return (
    <>
      <form.Field name="displayName">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor={field.name}>Display Name</Label>
            <Input
              id={field.name}
              className="h-11 rounded-xl border-border/60 bg-muted/20 font-medium transition-all focus:bg-background"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Inherit location name"
              value={String(field.state.value ?? "")}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="addressLines">
        {(field) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.name}>Printed Address</Label>
              <span className="type-support text-right">
                One line per printed address line
              </span>
            </div>
            <Textarea
              id={field.name}
              className="min-h-[120px] resize-none rounded-xl border-border/60 bg-muted/20 font-medium leading-relaxed transition-all focus:bg-background"
              maxLength={800}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Inherit business address"
              value={String(field.state.value ?? "")}
            />
          </div>
        )}
      </form.Field>

      <div className="grid gap-8 sm:grid-cols-2">
        <form.Field name="phone">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={field.name}>Printed Phone</Label>
              <Input
                id={field.name}
                className="h-11 rounded-xl border-border/60 bg-muted/20 font-medium transition-all focus:bg-background"
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Inherit business phone"
                value={String(field.state.value ?? "")}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={field.name}>Printed Email</Label>
              <Input
                id={field.name}
                className="h-11 rounded-xl border-border/60 bg-muted/20 font-medium transition-all focus:bg-background"
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Inherit business email"
                type="email"
                value={String(field.state.value ?? "")}
              />
            </div>
          )}
        </form.Field>
      </div>
    </>
  );
}

export function ReceiptBehaviorFields({
  form,
}: {
  form: LocationDocumentSettingsFormApi;
}) {
  return (
    <>
      <div className="grid gap-8 sm:grid-cols-3">
        <form.Field name="documentPrefix">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={field.name}>Number Prefix</Label>
              <Input
                id={field.name}
                className="h-11 rounded-xl border-border/60 bg-muted/20 font-medium transition-all focus:bg-background"
                maxLength={20}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Inherit"
                value={String(field.state.value ?? "")}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="defaultPaperSize">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={field.name}>Paper Size</Label>
              <Select
                value={String(field.state.value ?? "inherit")}
                onValueChange={(value) =>
                  field.handleChange(
                    value as LocationDocumentSettingsFormValues["defaultPaperSize"],
                  )
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-muted/20 transition-all focus:bg-background">
                  <SelectValue placeholder="Select paper size" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 shadow-sm">
                  <SelectItem value="inherit">Inherit</SelectItem>
                  <SelectItem value="receipt_80mm">80mm receipt</SelectItem>
                  <SelectItem value="a4">A4 document</SelectItem>
                  <SelectItem value="letter">Letter document</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
        <form.Field name="timezone">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={field.name}>Timezone</Label>
              <TimeZoneSelect
                allowInherit
                id={field.name}
                onChange={field.handleChange}
                value={String(field.state.value ?? "inherit")}
              />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="receiptFooter">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor={field.name}>Receipt Footer</Label>
            <Textarea
              id={field.name}
              className="min-h-[100px] resize-none rounded-xl border-border/60 bg-muted/20 font-medium leading-relaxed transition-all focus:bg-background"
              maxLength={500}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Inherit official footer"
              value={String(field.state.value ?? "")}
            />
          </div>
        )}
      </form.Field>
    </>
  );
}
