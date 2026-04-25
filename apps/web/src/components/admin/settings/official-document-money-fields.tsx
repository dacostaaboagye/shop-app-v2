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
import { Switch } from "@/components/ui/switch";
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
          <AppFormField
            description="Primary currency used for internal accounting and base pricing."
            inputId={field.name}
            label="Base currency"
          >
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
          <AppFormField
            description="Currency shown to customers by default."
            inputId={field.name}
            label="Display currency"
          >
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
          <AppFormField
            description="Number of decimal places used for prices. Standard retail flows usually use 2."
            inputId={field.name}
            label="Currency scale"
          >
            <Input
              id={field.name}
              max={4}
              min={0}
              onBlur={field.handleBlur}
              onChange={(event) =>
                field.handleChange(Number(event.target.value))
              }
              placeholder="2"
              type="number"
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
      <form.Field name="roundingMode">
        {(field) => (
          <AppFormField
            description="Mathematical strategy used when monetary values need rounding."
            inputId={field.name}
            label="Rounding mode"
          >
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
        description="Enables processing of orders and receipts in currencies other than the base currency."
        form={form}
        label="Allow multi-currency sales"
        name="allowMultiCurrencySales"
      />
      <BooleanField
        description="Enables manual override or automatic fetching of currency exchange rates for multi-currency transactions."
        form={form}
        label="Allow exchange rates"
        name="allowExchangeRates"
      />
    </FieldGroup>
  );
}

function BooleanField({
  form,
  description,
  label,
  name,
}: {
  form: OfficialDocumentSettingsFormApi;
  description?: string;
  label: string;
  name: "allowExchangeRates" | "allowMultiCurrencySales";
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <AppFormField
          inputId={field.name}
          label={label}
          {...(description ? { description } : {})}
        >
          <div className="flex h-10 items-center">
            <Switch
              checked={field.state.value}
              onCheckedChange={field.handleChange}
            />
          </div>
        </AppFormField>
      )}
    </form.Field>
  );
}
