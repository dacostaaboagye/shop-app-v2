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
          <AppFormField inputId={field.name} label="Legal business name">
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="registrationNumber">
        {(field) => (
          <AppFormField inputId={field.name} label="Registration number">
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="taxNumber">
        {(field) => (
          <AppFormField inputId={field.name} label="Tax number">
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="addressLines">
        {(field) => (
          <AppFormField inputId={field.name} label="Main address">
            <Textarea
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              rows={4}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="phone">
        {(field) => (
          <AppFormField inputId={field.name} label="Phone">
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="email">
        {(field) => (
          <AppFormField inputId={field.name} label="Email">
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              type="email"
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="website">
        {(field) => (
          <AppFormField inputId={field.name} label="Website">
            <Input
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
    </FieldGroup>
  );
}
