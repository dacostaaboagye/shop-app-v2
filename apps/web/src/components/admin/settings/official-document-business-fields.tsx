import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OfficialDocumentSettingsFormApi } from "./official-document-identity-fields";

export function OfficialDocumentBusinessFields({
  form,
}: {
  form: OfficialDocumentSettingsFormApi;
}) {
  return (
    <FieldGroup>
      <form.Field name="legalName">
        {(field) => (
          <AppFormField
            description="Name shown on invoices, GTNs, and other official output."
            inputId={field.name}
            label="Legal business name"
          >
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="AmaliTech Retail Ltd."
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="registrationNumber">
        {(field) => (
          <AppFormField
            description="Company or business registration identifier used on formal records."
            inputId={field.name}
            label="Registration number"
          >
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="CS123456789"
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="taxNumber">
        {(field) => (
          <AppFormField
            description="Tax or VAT identifier printed where regulations require it."
            inputId={field.name}
            label="Tax number"
          >
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="VAT-123456"
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="addressLines">
        {(field) => (
          <AppFormField
            description="Primary business address shown on official output and support correspondence."
            inputId={field.name}
            label="Main address"
          >
            <Textarea
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder={"No. 12 Main Street\nAccra, Ghana"}
              rows={4}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="phone">
        {(field) => (
          <AppFormField
            description="Main support or switchboard number shown on documents."
            inputId={field.name}
            label="Phone"
          >
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="+233 20 123 4567"
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="email">
        {(field) => (
          <AppFormField
            description="Reply-to and support contact shown on official communication."
            inputId={field.name}
            label="Business support email"
          >
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="support@example.com"
              type="email"
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="website">
        {(field) => (
          <AppFormField
            description="Public website shown on formal business records."
            inputId={field.name}
            label="Website"
          >
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="https://example.com"
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
    </FieldGroup>
  );
}
