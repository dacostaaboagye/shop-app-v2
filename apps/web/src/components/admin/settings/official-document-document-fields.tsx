import { AppFormField } from "@/components/forms/app-form-field";
import { TimeZoneSelect } from "@/components/settings/document-setting-selects";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OfficialDocumentSettingsFormApi } from "./official-document-identity-fields";
import type { OfficialDocumentSettingsFormValues } from "./official-document-settings-form.support";

export function OfficialDocumentDocumentFields({
  form,
}: {
  form: OfficialDocumentSettingsFormApi;
}) {
  return (
    <FieldGroup>
      <form.Field name="defaultPaperSize">
        {(field) => (
          <AppFormField inputId={field.name} label="Default paper size">
            <Select
              id={field.name}
              onChange={(event) =>
                field.handleChange(
                  event.target
                    .value as OfficialDocumentSettingsFormValues["defaultPaperSize"],
                )
              }
              value={field.state.value}
            >
              <option value="receipt_80mm">80mm receipt</option>
              <option value="a4">A4 document</option>
              <option value="letter">Letter document</option>
            </Select>
          </AppFormField>
        )}
      </form.Field>
      <TextField form={form} label="Receipt prefix" name="receiptPrefix" />
      <TextField form={form} label="Invoice prefix" name="invoicePrefix" />
      <TextField form={form} label="GTN prefix" name="gtnPrefix" />
      <TextField form={form} label="Locale" name="locale" />
      <form.Field name="timezone">
        {(field) => (
          <AppFormField inputId={field.name} label="Timezone">
            <TimeZoneSelect
              id={field.name}
              onChange={field.handleChange}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="receiptFooter">
        {(field) => (
          <AppFormField inputId={field.name} label="Footer">
            <Textarea
              id={field.name}
              maxLength={500}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              rows={4}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
    </FieldGroup>
  );
}

function TextField({
  form,
  label,
  name,
}: {
  form: OfficialDocumentSettingsFormApi;
  label: string;
  name: "gtnPrefix" | "invoicePrefix" | "locale" | "receiptPrefix";
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <AppFormField inputId={field.name} label={label}>
          <Input
            id={field.name}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            value={field.state.value}
          />
        </AppFormField>
      )}
    </form.Field>
  );
}
