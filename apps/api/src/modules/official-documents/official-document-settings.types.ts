import type {
  LocationDocumentSettingsResponse,
  OfficialDocumentProfileResponse,
  UpdateLocationDocumentSettingsRequest,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";
import type {
  DocumentBrandSettings,
  DocumentBusinessSettings,
  DocumentDefaults,
  LocationOverridePolicy,
  MoneySettings,
} from "@shop/database";

export type OfficialDocumentSettings = {
  brand: DocumentBrandSettings;
  business: DocumentBusinessSettings;
  currency: MoneySettings;
  documents: DocumentDefaults;
  locationOverridePolicy: LocationOverridePolicy;
};
export type OfficialDocumentProfile = OfficialDocumentProfileResponse;
export type OfficialDocumentSettingsPatch =
  UpdateOfficialDocumentSettingsRequest;
export type LocationDocumentSettings = LocationDocumentSettingsResponse;
export type LocationDocumentSettingsPatch =
  UpdateLocationDocumentSettingsRequest;

export type OfficialDocumentSettingsRecord = Omit<
  OfficialDocumentSettings,
  "updatedAt" | "updatedByUserSlug"
> & {
  updatedAt: Date | null;
  updatedByUserSlug: string | null;
};

export type LocationDocumentSettingsRecord = Omit<
  LocationDocumentSettings,
  "updatedAt" | "updatedByUserSlug"
> & {
  updatedAt: Date | null;
  updatedByUserSlug: string | null;
};
