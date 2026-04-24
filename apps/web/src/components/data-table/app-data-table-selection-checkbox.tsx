"use client";

import { useEffect, useRef } from "react";

export function AppDataTableSelectionCheckbox({
  ariaLabel,
  checked,
  indeterminate = false,
  onChange,
}: {
  ariaLabel: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      aria-label={ariaLabel}
      checked={checked}
      className="size-4 accent-primary"
      onChange={(event) => onChange(event.target.checked)}
      onClick={(event) => event.stopPropagation()}
      ref={ref}
      type="checkbox"
    />
  );
}
