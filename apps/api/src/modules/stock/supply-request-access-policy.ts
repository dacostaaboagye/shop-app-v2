import { AppError } from "../_core/errors/app-error.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type {
  GtnRow,
  SupplyRequestRow,
} from "./postgres-supply-request.repository.js";

type SupplyRequestPermissionService = {
  assertHasPermission(input: {
    locationId?: string;
    permission: string;
    scope?: "any_active" | "contextual";
    user: AuthenticatedActor;
  }): Promise<void>;
  resolvePermissionsForAnyScope(input: {
    userId: string;
  }): Promise<Array<{ key: string }>>;
};

export class SupplyRequestAccessPolicy {
  constructor(
    private readonly permissionService: SupplyRequestPermissionService,
  ) {}

  async assertCanCreateRequest(input: {
    actor: AuthenticatedActor;
    destinationLocationId: string;
  }): Promise<void> {
    await this.permissionService.assertHasPermission({
      locationId: input.destinationLocationId,
      permission: "stock.supply.request",
      user: input.actor,
    });
  }

  async assertCanListIncomingForSource(input: {
    actor: AuthenticatedActor;
    sourceLocationId: string;
  }): Promise<void> {
    await this.permissionService.assertHasPermission({
      locationId: input.sourceLocationId,
      permission: "stock.supply.manage",
      user: input.actor,
    });
  }

  async assertCanListRequestsForLocation(input: {
    actor: AuthenticatedActor;
    locationId: string;
  }): Promise<void> {
    await this.permissionService.assertHasPermission({
      locationId: input.locationId,
      permission: "stock.supply.manage",
      user: input.actor,
    });
  }

  async assertCanManageRequest(input: {
    actor: AuthenticatedActor;
    supplyRequest: SupplyRequestRow;
  }): Promise<void> {
    await this.permissionService.assertHasPermission({
      locationId: input.supplyRequest.sourceLocationId,
      permission: "stock.supply.manage",
      user: input.actor,
    });
  }

  async assertCanCancelRequest(input: {
    actor: AuthenticatedActor;
    supplyRequest: SupplyRequestRow;
  }): Promise<void> {
    if (input.supplyRequest.requesterId === input.actor.userId) {
      await this.permissionService.assertHasPermission({
        locationId: input.supplyRequest.locationId,
        permission: "stock.supply.request",
        user: input.actor,
      });
      return;
    }

    if (await this.isAdmin(input.actor)) {
      return;
    }

    throw forbiddenError(
      "Only the requesting worker or an admin can cancel this transfer request.",
    );
  }

  async assertCanConfirmReceipt(input: {
    actor: AuthenticatedActor;
    supplyRequest: SupplyRequestRow;
  }): Promise<void> {
    if (input.supplyRequest.requesterId === input.actor.userId) {
      await this.permissionService.assertHasPermission({
        locationId: input.supplyRequest.locationId,
        permission: "stock.supply.request",
        user: input.actor,
      });
      return;
    }

    if (await this.isAdmin(input.actor)) {
      return;
    }

    throw forbiddenError(
      "Only the requesting worker or an admin can confirm receipt for this transfer.",
    );
  }

  async assertCanViewGtn(input: {
    actor: AuthenticatedActor;
    gtn: GtnRow;
    supplyRequest: SupplyRequestRow;
  }): Promise<void> {
    if (input.supplyRequest.requesterId === input.actor.userId) {
      return;
    }

    if (
      await this.hasLocationPermission(
        input.actor,
        "stock.supply.manage",
        input.gtn.sourceLocationId,
      )
    ) {
      return;
    }

    if (
      await this.hasLocationPermission(
        input.actor,
        "stock.supply.manage",
        input.gtn.destinationLocationId,
      )
    ) {
      return;
    }

    if (await this.isAdmin(input.actor)) {
      return;
    }

    throw forbiddenError(
      "You are not allowed to view this goods transfer note.",
    );
  }

  private async hasLocationPermission(
    actor: AuthenticatedActor,
    permission: string,
    locationId: string,
  ): Promise<boolean> {
    try {
      await this.permissionService.assertHasPermission({
        locationId,
        permission,
        user: actor,
      });
      return true;
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === "forbidden" &&
        error.statusCode === 403
      ) {
        return false;
      }

      throw error;
    }
  }

  private async isAdmin(actor: AuthenticatedActor): Promise<boolean> {
    const permissions =
      await this.permissionService.resolvePermissionsForAnyScope({
        userId: actor.userId,
      });

    return permissions.some(
      (permission) => permission.key === "admin.dashboard.view",
    );
  }
}

function forbiddenError(detail: string): AppError {
  return new AppError({
    code: "forbidden",
    detail,
    statusCode: 403,
    title: "Forbidden",
  });
}
