import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type StockFilterSelectProps = {
  id: string;
  isLoading: boolean;
  label: string;
  loadingLabel: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ name: string; slug: string }>;
  placeholder: string;
  value: string;
};

export function StockFilterSelect({
  id,
  isLoading,
  label,
  loadingLabel,
  onChange,
  options,
  placeholder,
  value,
}: StockFilterSelectProps) {
  return (
    <div className="flex min-w-44 flex-1 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{isLoading ? loadingLabel : placeholder}</option>
        {options.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
