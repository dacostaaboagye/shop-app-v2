import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  currencyOptions,
  timeZoneOptions,
} from "./document-setting-select-options";

type SelectProps<T extends string = string> = {
  id: string;
  value: T;
  onChange: (value: T) => void;
};

export function CurrencySelect({ id, onChange, value }: SelectProps) {
  return (
    <Select onValueChange={(next) => onChange(next)} value={value}>
      <SelectTrigger className="w-full" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencyOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
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
    <Select onValueChange={(next) => onChange(next)} value={value}>
      <SelectTrigger className="w-full" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowInherit ? <SelectItem value="inherit">Inherit</SelectItem> : null}
        {timeZoneOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PaperSizeSelect<T extends string>({
  id,
  onChange,
  value,
}: SelectProps<T>) {
  return (
    <Select onValueChange={(next) => onChange(next as T)} value={value}>
      <SelectTrigger className="w-full" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="receipt_80mm">80mm receipt</SelectItem>
        <SelectItem value="a4">A4 document</SelectItem>
        <SelectItem value="letter">Letter document</SelectItem>
      </SelectContent>
    </Select>
  );
}
