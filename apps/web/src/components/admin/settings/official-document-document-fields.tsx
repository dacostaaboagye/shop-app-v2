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
          <AppFormField
            description="Default page size used when locations do not override their printing hardware preferences."
            inputId={field.name}
            label="Default paper size"
          >
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
        description="BCP 47 language tag used for date, number, and wording defaults in generated output."
        label="Locale"
        name="locale"
        placeholder="en-GB"
      />
      <form.Field name="timezone">
        {(field) => (
          <AppFormField
            description="Default timezone used for issue dates and operational timestamps on generated records."
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
          <AppFormField
            description="Reusable footer copy printed on receipts and other short-format output."
            inputId={field.name}
            label="Footer"
          >
            <Textarea
              id={field.name}
              maxLength={500}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder={
                "Thank you for your business.\nGoods sold are subject to store policy."
              }
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
  description,
  label,
  name,
  placeholder,
}: {
  form: OfficialDocumentSettingsFormApi;
  description?: string;
  label: string;
  name: "gtnPrefix" | "invoicePrefix" | "locale" | "receiptPrefix";
  placeholder?: string;
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <AppFormField
          inputId={field.name}
          label={label}
          {...(description ? { description } : {})}
        >
          <Input
            id={field.name}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder={placeholder}
            value={field.state.value}
          />
        </AppFormField>
      )}
    </form.Field>
  );
}
