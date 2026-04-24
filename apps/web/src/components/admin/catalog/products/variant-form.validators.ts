function isMoneyString(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value.trim()) && Number(value.trim()) > 0;
}

function isPositiveNumber(value: string): boolean {
  return Number.isFinite(Number(value.trim())) && Number(value.trim()) > 0;
}

function parseAttributesText(value: string): { ok: true } | { ok: false } {
  const entries = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const divider = entry.indexOf(":");
    if (divider <= 0) {
      return { ok: false };
    }

    const key = entry.slice(0, divider).trim();
    const itemValue = entry.slice(divider + 1).trim();
    if (!key || !itemValue) {
      return { ok: false };
    }
  }

  return { ok: true };
}

export function requiredString(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      value.trim() ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      value.trim() ? undefined : message,
  };
}

export function moneyString(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      isMoneyString(value) ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      isMoneyString(value) ? undefined : message,
  };
}

export function positiveIntegerOrBlank(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      value.trim() === "" || isPositiveInteger(value) ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      value.trim() === "" || isPositiveInteger(value) ? undefined : message,
  };
}

export function positiveNumberOrBlank(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      value.trim() === "" || isPositiveNumber(value) ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      value.trim() === "" || isPositiveNumber(value) ? undefined : message,
  };
}

export function attributeLines(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      parseAttributesText(value).ok ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      parseAttributesText(value).ok ? undefined : message,
  };
}
