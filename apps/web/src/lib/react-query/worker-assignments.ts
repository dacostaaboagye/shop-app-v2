import type {
  AssignVariantRequest,
  BatchAssignVariantRequest,
  BatchAssignVariantResponse,
  HandoverRecipientListResponse,
  HandoverResponse,
  InitiateHandoverRequest,
  LocationAssignmentListResponse,
  ReassignVariantRequest,
  RevertHandoverRequest,
  WorkerAssignmentListResponse,
  WorkerHandoverListResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const workerAssignmentsQueryKey = (locationId: string) =>
  ["assignments", "worker", locationId] as const;

export const locationAssignmentsQueryKey = (locationId: string) =>
  ["assignments", "manager", locationId] as const;

export const workerHandoversQueryKey = (locationId: string) =>
  ["handovers", "worker", locationId] as const;

export const workerHandoverRecipientsQueryKey = (locationId: string) =>
  ["handovers", "worker", "recipients", locationId] as const;

export async function fetchWorkerAssignments(
  locationId: string,
): Promise<WorkerAssignmentListResponse> {
  const params = new URLSearchParams({ locationId });
  return fetchJson<WorkerAssignmentListResponse>(
    `/api/worker/assignments?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchLocationAssignments(
  locationId: string,
): Promise<LocationAssignmentListResponse> {
  const params = new URLSearchParams({ locationId });
  return fetchJson<LocationAssignmentListResponse>(
    `/api/manager/assignments?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchWorkerHandovers(
  locationId: string,
): Promise<WorkerHandoverListResponse> {
  const params = new URLSearchParams({ locationId });
  return fetchJson<WorkerHandoverListResponse>(
    `/api/worker/handovers?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchWorkerHandoverRecipients(
  locationId: string,
): Promise<HandoverRecipientListResponse> {
  const params = new URLSearchParams({ locationId });
  return fetchJson<HandoverRecipientListResponse>(
    `/api/worker/handovers/recipients?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function postAssignVariant(
  body: AssignVariantRequest,
): Promise<OwnershipEventPlaceholder> {
  return fetchJson<OwnershipEventPlaceholder>(
    "/api/manager/assignments",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postBatchAssignVariants(
  body: BatchAssignVariantRequest,
): Promise<BatchAssignVariantResponse> {
  return fetchJson<BatchAssignVariantResponse>(
    "/api/manager/assignments/batch",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postReassignVariant(
  body: ReassignVariantRequest,
): Promise<OwnershipEventPlaceholder> {
  return fetchJson<OwnershipEventPlaceholder>(
    "/api/manager/assignments/reassign",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postManagerHandover(
  body: InitiateHandoverRequest,
): Promise<HandoverResponse> {
  return fetchJson<HandoverResponse>(
    "/api/manager/handovers",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postManagerRevertHandover(
  body: RevertHandoverRequest,
): Promise<void> {
  return fetchJson<void>(
    "/api/manager/handovers/revert",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postWorkerHandover(
  body: InitiateHandoverRequest,
): Promise<HandoverResponse> {
  return fetchJson<HandoverResponse>(
    "/api/worker/handovers",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postWorkerRevertHandover(
  body: RevertHandoverRequest,
): Promise<void> {
  return fetchJson<void>(
    "/api/worker/handovers/revert",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

type OwnershipEventPlaceholder = Record<string, unknown>;
