import type {
  AdminMediaConfirmRequest,
  AdminMediaListResponse,
  AdminMediaPresignResponse,
  AdminMediaRecord,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const accountProfileMediaQueryKey = ["auth", "me", "media"] as const;

export async function fetchAccountProfileMedia(): Promise<AdminMediaListResponse> {
  return fetchJson<AdminMediaListResponse>("/api/auth/me/media", undefined, {
    auth: "required",
  });
}

export async function presignAccountProfileMedia(input: {
  fileSizeBytes: number;
  filename: string;
  mimeType: string;
}): Promise<AdminMediaPresignResponse> {
  return fetchJson<AdminMediaPresignResponse>(
    "/api/auth/me/media/presign",
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function confirmAccountProfileMedia(
  input: Omit<
    AdminMediaConfirmRequest,
    "entitySlug" | "entityType" | "isPrimary" | "position"
  >,
): Promise<AdminMediaRecord> {
  return fetchJson<AdminMediaRecord>(
    "/api/auth/me/media/confirm",
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function setAccountProfileMediaPrimary(
  assignmentId: string,
): Promise<AdminMediaRecord> {
  return fetchJson<AdminMediaRecord>(
    `/api/auth/me/media/${encodeURIComponent(assignmentId)}/set-primary`,
    { method: "POST" },
    { auth: "required" },
  );
}

export async function deleteAccountProfileMedia(
  assignmentId: string,
): Promise<void> {
  return fetchJson<void>(
    `/api/auth/me/media/${encodeURIComponent(assignmentId)}`,
    { method: "DELETE" },
    { auth: "required" },
  );
}
