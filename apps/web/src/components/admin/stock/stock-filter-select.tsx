import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <Select onValueChange={onChange} value={value || "all"}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={isLoading ? loadingLabel : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {isLoading ? loadingLabel : placeholder}
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.slug} value={option.slug}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
