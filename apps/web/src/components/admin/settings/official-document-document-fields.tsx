import { AppFormField } from "@/components/forms/app-form-field";
import {
  PaperSizeSelect,
  TimeZoneSelect,
} from "@/components/settings/document-setting-selects";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OfficialDocumentSettingsFormApi } from "./official-document-identity-fields";

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
            <PaperSizeSelect
              id={field.name}
              onChange={field.handleChange}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <TextField form={form} label="Receipt prefix" name="receiptPrefix" />
      <TextField form={form} label="Invoice prefix" name="invoicePrefix" />
      <TextField form={form} label="GTN prefix" name="gtnPrefix" />
      <TextField
        form={form}
        info="BCP 47 language tag (e.g. en-GB) used for document formatting and locale-specific translations."
        label="Locale"
        name="locale"
      />
      <form.Field name="timezone">
        {(field) => (
          <AppFormField
            info="The default timezone used for document issue dates and operational timestamps."
            inputId={field.name}
            label="Timezone"
          >
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
  info,
  label,
  name,
}: {
  form: OfficialDocumentSettingsFormApi;
  info?: string;
  label: string;
  name: "gtnPrefix" | "invoicePrefix" | "locale" | "receiptPrefix";
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <AppFormField info={info} inputId={field.name} label={label}>
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
