import { AppFormField } from "@/components/forms/app-form-field";
import { CurrencySelect } from "@/components/settings/document-setting-selects";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OfficialDocumentSettingsFormApi } from "./official-document-identity-fields";
import type { OfficialDocumentSettingsFormValues } from "./official-document-settings-form.support";

export function OfficialDocumentMoneyFields({
  form,
}: {
  form: OfficialDocumentSettingsFormApi;
}) {
  return (
    <FieldGroup>
      <form.Field name="baseCurrencyCode">
        {(field) => (
          <AppFormField inputId={field.name} label="Base currency">
            <CurrencySelect
              id={field.name}
              onChange={field.handleChange}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="defaultDisplayCurrencyCode">
        {(field) => (
          <AppFormField inputId={field.name} label="Display currency">
            <CurrencySelect
              id={field.name}
              onChange={field.handleChange}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="currencyScale">
        {(field) => (
          <AppFormField inputId={field.name} label="Currency scale">
            <Input
              id={field.name}
              max={4}
              min={0}
              onBlur={field.handleBlur}
              onChange={(event) =>
                field.handleChange(Number(event.target.value))
              }
              type="number"
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="roundingMode">
        {(field) => (
          <AppFormField inputId={field.name} label="Rounding mode">
            <Select
              onValueChange={(value) =>
                field.handleChange(
                  value as OfficialDocumentSettingsFormValues["roundingMode"],
                )
              }
              value={field.state.value}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="half_up">Half up</SelectItem>
                <SelectItem value="half_even">Half even</SelectItem>
                <SelectItem value="floor">Floor</SelectItem>
                <SelectItem value="ceiling">Ceiling</SelectItem>
              </SelectContent>
            </Select>
          </AppFormField>
        )}
      </form.Field>
      <BooleanField
        form={form}
        label="Allow multi-currency sales"
        name="allowMultiCurrencySales"
      />
      <BooleanField
        form={form}
        label="Allow exchange rates"
        name="allowExchangeRates"
      />
    </FieldGroup>
  );
}

function BooleanField({
  form,
  label,
  name,
}: {
  form: OfficialDocumentSettingsFormApi;
  label: string;
  name: "allowExchangeRates" | "allowMultiCurrencySales";
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <AppFormField inputId={field.name} label={label}>
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
  );
}
