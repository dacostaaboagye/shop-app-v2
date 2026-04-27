import type {
  EmailOperationsResponse,
  EmailRecipientStateResponse,
  EmailTemplatePreviewRequest,
  EmailTemplatePreviewResponse,
  EmailTemplatePreviewType,
  IssuedDocumentSnapshotResponse,
  LocationDocumentSettingsResponse,
  OfficialDocumentProfileResponse,
  OfficialDocumentSettingsResponse,
  SendIssuedSalesDocumentEmailResponse,
  SendTestEmailRequest,
  UpdateLocationDocumentSettingsRequest,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";
import { fetchFile } from "@/lib/react-query/fetch-file";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const officialDocumentSettingsQueryKey = [
  "official-documents",
  "settings",
] as const;
export const officialDocumentProfileQueryKey = (locationId?: string) =>
  ["official-documents", "profile", locationId ?? "global"] as const;
export const salesDocumentSnapshotQueryKey = (reference: string) =>
  ["official-documents", "sales-snapshot", reference] as const;
export const salesDocumentDownloadFileQueryKey = (reference: string) =>
  ["official-documents", "sales-download-file", reference] as const;
export const gtnDocumentDownloadFileQueryKey = (reference: string) =>
  ["official-documents", "gtn-download-file", reference] as const;
export const locationDocumentSettingsQueryKey = (locationId: string) =>
  ["official-documents", "location-settings", locationId] as const;
export const emailTemplatePreviewQueryKey = (
  type: EmailTemplatePreviewType,
  payload: EmailTemplatePreviewRequest,
) => ["official-documents", "email-template-preview", type, payload] as const;
export const emailOperationsQueryKey = [
  "messaging",
  "email-operations",
] as const;
export const emailRecipientStateQueryKey = (email: string) =>
  ["messaging", "email-recipient-state", email] as const;

export async function fetchOfficialDocumentSettings() {
  return fetchJson<OfficialDocumentSettingsResponse>(
    "/api/admin/settings/documents",
    undefined,
    { auth: "required" },
  );
}

export async function fetchOfficialDocumentProfile(locationId?: string) {
  const query = locationId
    ? `?locationId=${encodeURIComponent(locationId)}`
    : "";
  return fetchJson<OfficialDocumentProfileResponse>(
    `/api/documents/profile${query}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchSalesDocumentSnapshot(reference: string) {
  return fetchJson<IssuedDocumentSnapshotResponse>(
    `/api/documents/sales/${encodeURIComponent(reference)}/snapshot`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchSalesDocumentDownloadFile(reference: string) {
  const safeReference = reference.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return fetchFile(
    `/api/documents/sales/${encodeURIComponent(reference)}/download`,
    undefined,
    {
      auth: "required",
      fallbackFilename: `${safeReference || "sales-document"}.pdf`,
    },
  );
}

export async function sendSalesDocumentEmail(reference: string) {
  return fetchJson<SendIssuedSalesDocumentEmailResponse>(
    `/api/documents/sales/${encodeURIComponent(reference)}/send-email`,
    {
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function fetchGtnDocumentDownloadFile(reference: string) {
  const safeReference = reference.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return fetchFile(
    `/api/documents/gtns/${encodeURIComponent(reference)}/download`,
    undefined,
    {
      auth: "required",
      fallbackFilename: `${safeReference || "goods-transfer-note"}.pdf`,
    },
  );
}

export async function updateOfficialDocumentSettings(
  payload: UpdateOfficialDocumentSettingsRequest,
) {
  return fetchJson<OfficialDocumentSettingsResponse>(
    "/api/admin/settings/documents",
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}

export async function previewEmailTemplate({
  payload,
  type,
}: {
  payload: EmailTemplatePreviewRequest;
  type: EmailTemplatePreviewType;
}) {
  return fetchJson<EmailTemplatePreviewResponse>(
    `/api/admin/settings/email-templates/${encodeURIComponent(type)}/preview`,
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function fetchLocationDocumentSettings(locationId: string) {
  return fetchJson<LocationDocumentSettingsResponse>(
    `/api/manager/settings/locations/${encodeURIComponent(locationId)}/documents`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchEmailOperations() {
  return fetchJson<EmailOperationsResponse>(
    "/api/admin/settings/email/operations",
    undefined,
    { auth: "required" },
  );
}

export async function sendTestEmail(payload: SendTestEmailRequest) {
  return fetchJson<{ ok: true }>(
    "/api/admin/settings/email/test-send",
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function fetchEmailRecipientState(email: string) {
  return fetchJson<EmailRecipientStateResponse>(
    `/api/admin/settings/email/recipient-state?email=${encodeURIComponent(email)}`,
    undefined,
    { auth: "required" },
  );
}

export async function updateLocationDocumentSettings({
  locationId,
  payload,
}: {
  locationId: string;
  payload: UpdateLocationDocumentSettingsRequest;
}) {
  return fetchJson<LocationDocumentSettingsResponse>(
    `/api/manager/settings/locations/${encodeURIComponent(locationId)}/documents`,
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}
