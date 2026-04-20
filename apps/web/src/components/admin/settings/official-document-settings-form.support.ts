import type {
  OfficialDocumentSettingsResponse,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";

export type OfficialDocumentSettingsFormValues = {
  baseCurrencyCode: string;
  brandName: string;
  currencyScale: number;
  defaultDisplayCurrencyCode: string;
  defaultPaperSize: "receipt_80mm" | "a4" | "letter";
  legalName: string;
  logoText: string;
  receiptFooter: string;
  taxNumber: string;
  timezone: string;
};

export function toOfficialDocumentSettingsFormValues(
  settings: OfficialDocumentSettingsResponse,
): OfficialDocumentSettingsFormValues {
  return {
    baseCurrencyCode: settings.currency.baseCurrencyCode,
    brandName: settings.brand.brandName,
    currencyScale: settings.currency.currencyScale,
    defaultDisplayCurrencyCode: settings.currency.defaultDisplayCurrencyCode,
    defaultPaperSize: settings.documents.defaultPaperSize,
    legalName: settings.business.legalName,
    logoText: settings.brand.logoText,
    receiptFooter: settings.documents.receiptFooter,
    taxNumber: settings.business.taxNumber,
    timezone: settings.documents.timezone,
  };
}

export function toOfficialDocumentSettingsPayload(
  values: OfficialDocumentSettingsFormValues,
): UpdateOfficialDocumentSettingsRequest {
  return {
    brand: {
      brandName: values.brandName.trim(),
      logoText: values.logoText.trim(),
    },
    business: {
      legalName: values.legalName.trim(),
      taxNumber: values.taxNumber.trim(),
    },
    currency: {
      baseCurrencyCode: values.baseCurrencyCode.trim().toUpperCase(),
      currencyScale: values.currencyScale,
      defaultDisplayCurrencyCode: values.defaultDisplayCurrencyCode
        .trim()
        .toUpperCase(),
    },
    documents: {
      defaultPaperSize: values.defaultPaperSize,
      receiptFooter: values.receiptFooter.trim(),
      timezone: values.timezone.trim(),
    },
  };
}
