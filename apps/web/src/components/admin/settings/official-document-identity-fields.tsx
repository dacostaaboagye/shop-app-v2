import type { ReactNode } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toColorInputValue } from "./official-document-color-input.support";
import type { OfficialDocumentSettingsFormValues } from "./official-document-settings-form.support";

type FieldValue<TName extends keyof OfficialDocumentSettingsFormValues> =
  OfficialDocumentSettingsFormValues[TName];

type FieldRenderProps<TName extends keyof OfficialDocumentSettingsFormValues> =
  {
    handleBlur: () => void;
    handleChange: (value: FieldValue<TName>) => void;
    name: string;
    state: { value: FieldValue<TName> };
  };
type TextFieldName = "brandName" | "logoText";

export type OfficialDocumentSettingsFormApi = {
  Field: <TName extends keyof OfficialDocumentSettingsFormValues>(props: {
    children: (field: FieldRenderProps<TName>) => ReactNode;
    name: TName;
  }) => ReactNode;
};

export function OfficialDocumentBrandFields({
  form,
}: {
  form: OfficialDocumentSettingsFormApi;
}) {
  return (
    <FieldGroup>
      <form.Field name="brandName">
        {(field) => <TextField field={field} label="Brand name" />}
      </form.Field>
      <form.Field name="logoText">
        {(field) => <TextField field={field} label="Logo mark" maxLength={8} />}
      </form.Field>
      <form.Field name="primaryColor">
        {(field) => <ColorField field={field} label="Primary color" />}
      </form.Field>
      <form.Field name="accentColor">
        {(field) => <ColorField field={field} label="Accent color" />}
      </form.Field>
    </FieldGroup>
  );
}

function TextField<TName extends TextFieldName>({
  field,
  label,
  maxLength,
}: {
  field: FieldRenderProps<TName>;
  label: string;
  maxLength?: number;
}) {
  return (
    <AppFormField inputId={field.name} label={label}>
      <Input
        id={field.name}
        maxLength={maxLength}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        value={String(field.state.value)}
      />
    </AppFormField>
  );
}

function ColorField<TName extends "accentColor" | "primaryColor">({
  field,
  label,
}: {
  field: FieldRenderProps<TName>;
  label: string;
}) {
  return (
    <AppFormField inputId={field.name} label={label}>
      <div className="flex items-center gap-2">
        <Input
          aria-label={`${label} picker`}
          className="size-10 shrink-0 cursor-pointer p-1"
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          type="color"
          value={toColorInputValue(field.state.value)}
        />
        <Input
          id={field.name}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          placeholder="hsl(174 52% 23%)"
          value={field.state.value}
        />
      </div>
    </AppFormField>
  );
}
