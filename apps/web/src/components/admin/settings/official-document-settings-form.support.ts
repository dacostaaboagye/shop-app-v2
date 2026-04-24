import type {
  OfficialDocumentSettingsResponse,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";

export type OfficialDocumentSettingsFormValues = {
  accentColor: string;
  addressLines: string;
  allowExchangeRates: boolean;
  allowLocationAddress: boolean;
  allowLocationContact: boolean;
  allowLocationDisplayName: boolean;
  allowLocationFooter: boolean;
  allowLocationNumberPrefix: boolean;
  allowLocationPaperSize: boolean;
  allowMultiCurrencySales: boolean;
  baseCurrencyCode: string;
  brandName: string;
  currencyScale: number;
  defaultDisplayCurrencyCode: string;
  defaultPaperSize: "receipt_80mm" | "a4" | "letter";
  email: string;
  emailVerificationActionLabel: string;
  emailVerificationFooter: string;
  emailVerificationHeading: string;
  emailVerificationIntro: string;
  emailVerificationSubject: string;
  gtnPrefix: string;
  invoicePrefix: string;
  legalName: string;
  locale: string;
  logoText: string;
  phone: string;
  passwordResetActionLabel: string;
  passwordResetFooter: string;
  passwordResetHeading: string;
  passwordResetIntro: string;
  passwordResetSubject: string;
  primaryColor: string;
  receiptFooter: string;
  receiptPrefix: string;
  registrationNumber: string;
  roundingMode: "half_even" | "half_up" | "floor" | "ceiling";
  supplierInviteActionLabel: string;
  supplierInviteFooter: string;
  supplierInviteHeading: string;
  supplierInviteIntro: string;
  supplierInviteSubject: string;
  taxNumber: string;
  timezone: string;
  website: string;
};

export function toOfficialDocumentSettingsFormValues(
  settings: OfficialDocumentSettingsResponse,
): OfficialDocumentSettingsFormValues {
  return {
    accentColor: settings.brand.accentColor,
    addressLines: settings.business.addressLines.join("\n"),
    allowExchangeRates: settings.currency.allowExchangeRates,
    allowLocationAddress: settings.locationOverridePolicy.allowLocationAddress,
    allowLocationContact: settings.locationOverridePolicy.allowLocationContact,
    allowLocationDisplayName:
      settings.locationOverridePolicy.allowLocationDisplayName,
    allowLocationFooter: settings.locationOverridePolicy.allowLocationFooter,
    allowLocationNumberPrefix:
      settings.locationOverridePolicy.allowLocationNumberPrefix,
    allowLocationPaperSize:
      settings.locationOverridePolicy.allowLocationPaperSize,
    allowMultiCurrencySales: settings.currency.allowMultiCurrencySales,
    baseCurrencyCode: settings.currency.baseCurrencyCode,
    brandName: settings.brand.brandName,
    currencyScale: settings.currency.currencyScale,
    defaultDisplayCurrencyCode: settings.currency.defaultDisplayCurrencyCode,
    defaultPaperSize: settings.documents.defaultPaperSize,
    email: settings.business.email,
    emailVerificationActionLabel:
      settings.emailTemplates.emailVerification.actionLabel,
    emailVerificationFooter: settings.emailTemplates.emailVerification.footer,
    emailVerificationHeading: settings.emailTemplates.emailVerification.heading,
    emailVerificationIntro: settings.emailTemplates.emailVerification.intro,
    emailVerificationSubject: settings.emailTemplates.emailVerification.subject,
    gtnPrefix: settings.documents.gtnPrefix,
    invoicePrefix: settings.documents.invoicePrefix,
    legalName: settings.business.legalName,
    locale: settings.documents.locale,
    logoText: settings.brand.logoText,
    phone: settings.business.phone,
    passwordResetActionLabel: settings.emailTemplates.passwordReset.actionLabel,
    passwordResetFooter: settings.emailTemplates.passwordReset.footer,
    passwordResetHeading: settings.emailTemplates.passwordReset.heading,
    passwordResetIntro: settings.emailTemplates.passwordReset.intro,
    passwordResetSubject: settings.emailTemplates.passwordReset.subject,
    primaryColor: settings.brand.primaryColor,
    receiptFooter: settings.documents.receiptFooter,
    receiptPrefix: settings.documents.receiptPrefix,
    registrationNumber: settings.business.registrationNumber,
    roundingMode: settings.currency.roundingMode,
    supplierInviteActionLabel:
      settings.emailTemplates.supplierInvite.actionLabel,
    supplierInviteFooter: settings.emailTemplates.supplierInvite.footer,
    supplierInviteHeading: settings.emailTemplates.supplierInvite.heading,
    supplierInviteIntro: settings.emailTemplates.supplierInvite.intro,
    supplierInviteSubject: settings.emailTemplates.supplierInvite.subject,
    taxNumber: settings.business.taxNumber,
    timezone: settings.documents.timezone,
    website: settings.business.website,
  };
}

export function toOfficialDocumentSettingsPayload(
  values: OfficialDocumentSettingsFormValues,
): UpdateOfficialDocumentSettingsRequest {
  return {
    brand: {
      accentColor: values.accentColor.trim(),
      brandName: values.brandName.trim(),
      logoText: values.logoText.trim(),
      primaryColor: values.primaryColor.trim(),
    },
    business: {
      addressLines: normalizeAddressLines(values.addressLines),
      email: values.email.trim(),
      legalName: values.legalName.trim(),
      phone: values.phone.trim(),
      registrationNumber: values.registrationNumber.trim(),
      taxNumber: values.taxNumber.trim(),
      website: values.website.trim(),
    },
    currency: {
      allowExchangeRates: values.allowExchangeRates,
      allowMultiCurrencySales: values.allowMultiCurrencySales,
      baseCurrencyCode: values.baseCurrencyCode.trim().toUpperCase(),
      currencyScale: values.currencyScale,
      defaultDisplayCurrencyCode: values.defaultDisplayCurrencyCode
        .trim()
        .toUpperCase(),
      roundingMode: values.roundingMode,
    },
    documents: {
      defaultPaperSize: values.defaultPaperSize,
      gtnPrefix: values.gtnPrefix.trim(),
      invoicePrefix: values.invoicePrefix.trim(),
      locale: values.locale.trim(),
      receiptFooter: values.receiptFooter.trim(),
      receiptPrefix: values.receiptPrefix.trim(),
      timezone: values.timezone.trim(),
    },
    emailTemplates: {
      emailVerification: {
        actionLabel: values.emailVerificationActionLabel.trim(),
        footer: values.emailVerificationFooter.trim(),
        heading: values.emailVerificationHeading.trim(),
        intro: values.emailVerificationIntro.trim(),
        subject: values.emailVerificationSubject.trim(),
      },
      passwordReset: {
        actionLabel: values.passwordResetActionLabel.trim(),
        footer: values.passwordResetFooter.trim(),
        heading: values.passwordResetHeading.trim(),
        intro: values.passwordResetIntro.trim(),
        subject: values.passwordResetSubject.trim(),
      },
      supplierInvite: {
        actionLabel: values.supplierInviteActionLabel.trim(),
        footer: values.supplierInviteFooter.trim(),
        heading: values.supplierInviteHeading.trim(),
        intro: values.supplierInviteIntro.trim(),
        subject: values.supplierInviteSubject.trim(),
      },
    },
    locationOverridePolicy: {
      allowLocationAddress: values.allowLocationAddress,
      allowLocationContact: values.allowLocationContact,
      allowLocationDisplayName: values.allowLocationDisplayName,
      allowLocationFooter: values.allowLocationFooter,
      allowLocationNumberPrefix: values.allowLocationNumberPrefix,
      allowLocationPaperSize: values.allowLocationPaperSize,
    },
  };
}

function normalizeAddressLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}
