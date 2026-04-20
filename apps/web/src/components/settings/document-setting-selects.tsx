import { Select } from "@/components/ui/select";
import {
  currencyOptions,
  timeZoneOptions,
} from "./document-setting-select-options";

type SelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
};

export function CurrencySelect({ id, onChange, value }: SelectProps) {
  return (
    <Select
      id={id}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {currencyOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function TimeZoneSelect({
  allowInherit = false,
  id,
  onChange,
  value,
}: SelectProps & { allowInherit?: boolean }) {
  return (
    <Select
      id={id}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {allowInherit ? <option value="">Inherit</option> : null}
      {timeZoneOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
