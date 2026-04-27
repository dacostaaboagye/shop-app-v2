import { AppError } from "../_core/errors/app-error.js";
import type { SupplyRequestAccessPolicy } from "./supply-request-access-policy.js";
import type {
  getAuthenticatedActor,
  StockSupplyRouteDependencies,
} from "./supply-request-route-support.js";

export async function resolveIncomingSourceLocationIds(
  accessPolicy: SupplyRequestAccessPolicy,
  actor: ReturnType<typeof getAuthenticatedActor>,
  sourceLocationId: string | undefined,
) {
  if (sourceLocationId) {
    await accessPolicy.assertCanListIncomingForSource({
      actor,
      sourceLocationId,
    });
    return [sourceLocationId];
  }

  return accessPolicy.listManageableSourceLocationIds({ actor });
}

export async function loadManageableRequest(
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
  actor: ReturnType<typeof getAuthenticatedActor>,
  id: string,
  title: string,
) {
  const existingRequest =
    await dependencies.supplyRequestRepository.findById(id);
  if (!existingRequest) {
    throw manageRequestNotFound(title);
  }
  await accessPolicy.assertCanManageRequest({
    actor,
    supplyRequest: existingRequest,
  });
  return existingRequest;
}

export function manageRequestNotFound(title: string) {
  return new AppError({
    code: "not_found",
    detail: requestNotFoundDetail(title),
    statusCode: 404,
    title,
  });
}

function requestNotFoundDetail(title: string) {
  switch (title) {
    case "Cannot approve":
    case "Cannot reject":
      return "Request not found or is not in a pending state.";
    case "Cannot dispatch":
      return "Supply request not found or is not in an approved state.";
    default:
      return "Supply request not found.";
  }
}
