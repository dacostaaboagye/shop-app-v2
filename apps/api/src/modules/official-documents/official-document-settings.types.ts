import type {
  LocationDocumentSettingsResponse,
  OfficialDocumentProfileResponse,
  OfficialDocumentSettingsResponse,
  UpdateLocationDocumentSettingsRequest,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";

export type OfficialDocumentSettings = OfficialDocumentSettingsResponse;
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
