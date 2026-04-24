import {
  DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
  type OfficialDocumentProfile,
} from "@/lib/documents/official-document-profile";

export type MoneyProfile = Pick<
  OfficialDocumentProfile,
  "currencyCode" | "currencyScale" | "locale"
>;

export function formatMoney(
  value: number | string | null | undefined,
  profile: MoneyProfile = DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
): string {
  if (value == null) return formatMoney(0, profile);

  const rawValue = typeof value === "string" ? value.trim() : String(value);
  if (!rawValue) return formatMoney(0, profile);
  if (hasCurrencyMarker(rawValue)) return rawValue;

  const amount = toNumericAmount(rawValue);
  if (amount == null) return `${profile.currencyCode} ${rawValue}`;

  return `${profile.currencyCode} ${amount.toLocaleString(profile.locale, {
    maximumFractionDigits: profile.currencyScale,
    minimumFractionDigits: profile.currencyScale,
  })}`;
}

export function toNumericAmount(value: number | string): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function hasCurrencyMarker(value: string): boolean {
  return /(^|\s)[A-Z]{3}/.test(value) || /\p{Sc}/u.test(value);
}
