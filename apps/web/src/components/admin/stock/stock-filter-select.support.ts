const ALL_FILTER_VALUE = "all";

export function toStockFilterSelectValue(value: string): string {
  return value || ALL_FILTER_VALUE;
}

export function fromStockFilterSelectValue(value: string): string {
  return value === ALL_FILTER_VALUE ? "" : value;
}
