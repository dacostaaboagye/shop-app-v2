import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import type { OfficialDocumentSettingsFormApi } from "./official-document-identity-fields";

const OVERRIDE_FIELDS = [
  {
    label: "Location display name",
    name: "allowLocationDisplayName",
  },
  {
    label: "Location address",
    name: "allowLocationAddress",
  },
  {
    label: "Location contact details",
    name: "allowLocationContact",
  },
  {
    label: "Location footer",
    name: "allowLocationFooter",
  },
  {
    label: "Location paper size",
    name: "allowLocationPaperSize",
  },
  {
    label: "Location document prefix",
    name: "allowLocationNumberPrefix",
  },
] as const;

export function OfficialDocumentOverridePolicyFields({
  form,
}: {
  form: OfficialDocumentSettingsFormApi;
}) {
  return (
    <FieldGroup>
      {OVERRIDE_FIELDS.map((item) => (
        <form.Field key={item.name} name={item.name}>
          {(field) => (
            <AppFormField inputId={field.name} label={item.label}>
              <input
                checked={field.state.value}
                className="size-4 accent-primary"
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.checked)}
                type="checkbox"
              />
            </AppFormField>
          )}
        </form.Field>
      ))}
    </FieldGroup>
  );
}
