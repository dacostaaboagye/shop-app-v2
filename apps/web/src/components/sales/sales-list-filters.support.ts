import { parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";

export function toSalesDateRange(input: {
  dateFrom: string;
  dateTo: string;
}): DateRange | undefined {
  if (!input.dateFrom) {
    return undefined;
  }

  return {
    from: parseISO(input.dateFrom),
    ...(input.dateTo ? { to: parseISO(input.dateTo) } : {}),
  };
}

export function fromSalesDateRange(value: DateRange | undefined): {
  dateFrom: string;
  dateTo: string;
} {
  return {
    dateFrom: value?.from ? value.from.toISOString().slice(0, 10) : "",
    dateTo: value?.to ? value.to.toISOString().slice(0, 10) : "",
  };
}
