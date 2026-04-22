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

type SelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
};

export function CurrencySelect({ id, onChange, value }: SelectProps) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full">
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
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full">
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

export function PaperSizeSelect({ id, onChange, value }: SelectProps) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full">
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
