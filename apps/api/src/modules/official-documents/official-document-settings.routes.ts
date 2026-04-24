import {
  emailTemplatePreviewRequestSchema,
  emailTemplatePreviewResponseSchema,
  emailTemplatePreviewTypeSchema,
  locationDocumentSettingsResponseSchema,
  officialDocumentProfileQuerySchema,
  officialDocumentProfileResponseSchema,
  officialDocumentSettingsResponseSchema,
  updateLocationDocumentSettingsRequestSchema,
  updateOfficialDocumentSettingsRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import {
  getAuthenticatedActor,
  getAuthenticatedUserId,
} from "../auth/auth-route-support.js";
import type { OfficialDocumentSettingsService } from "./official-document-settings.service.js";

type OfficialDocumentSettingsRouteDependencies = {
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">;
  settingsService: Pick<
    OfficialDocumentSettingsService,
    | "getGlobalSettings"
    | "getLocationSettings"
    | "previewEmailTemplate"
    | "resolveDocumentProfile"
    | "updateGlobalSettings"
    | "updateLocationSettings"
  >;
};

const locationParamsSchema = z.object({ locationId: z.string().uuid() });

const adminGetSettingsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.view" },
  method: "GET",
  url: "/api/admin/settings/documents",
};

const adminUpdateSettingsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.manage" },
  method: "PATCH",
  url: "/api/admin/settings/documents",
};

const adminPreviewEmailTemplateRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.view" },
  method: "GET",
  url: "/api/admin/settings/email-templates/:type/preview",
};

const adminPreviewDraftEmailTemplateRoute: RouteDefinition = {
  access: { kind: "permission", permission: "settings.documents.view" },
  method: "POST",
  url: "/api/admin/settings/email-templates/:type/preview",
};

const getDocumentProfileRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/documents/profile",
};

const locationGetSettingsRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "settings.location_documents.manage",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/manager/settings/locations/:locationId/documents",
};

const locationUpdateSettingsRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "settings.location_documents.manage",
    scope: "any_active",
  },
  method: "PATCH",
  url: "/api/manager/settings/locations/:locationId/documents",
};

export function registerOfficialDocumentSettingsRoutes(
  server: FastifyInstance,
  dependencies: OfficialDocumentSettingsRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: getDocumentProfileRoute.access },
    method: getDocumentProfileRoute.method,
    url: getDocumentProfileRoute.url,
    async handler(request) {
      const query = officialDocumentProfileQuerySchema.parse(request.query);
      const profile = await dependencies.settingsService.resolveDocumentProfile(
        query.locationId ? { locationId: query.locationId } : {},
      );
      return officialDocumentProfileResponseSchema.parse(profile);
    },
  });

  server.route({
    config: { access: adminGetSettingsRoute.access },
    method: adminGetSettingsRoute.method,
    url: adminGetSettingsRoute.url,
    async handler() {
      const settings = await dependencies.settingsService.getGlobalSettings();
      return officialDocumentSettingsResponseSchema.parse(settings);
    },
  });

  server.route({
    config: { access: adminUpdateSettingsRoute.access },
    method: adminUpdateSettingsRoute.method,
    url: adminUpdateSettingsRoute.url,
    async handler(request) {
      const patch = updateOfficialDocumentSettingsRequestSchema.parse(
        request.body,
      );
      const settings = await dependencies.settingsService.updateGlobalSettings({
        actor: getAuthenticatedActor(request),
        now: new Date(),
        patch,
        updatedBy: getAuthenticatedUserId(request),
      });
      return officialDocumentSettingsResponseSchema.parse(settings);
    },
  });

  server.route({
    config: { access: adminPreviewEmailTemplateRoute.access },
    method: adminPreviewEmailTemplateRoute.method,
    url: adminPreviewEmailTemplateRoute.url,
    async handler(request) {
      const { type } = z
        .object({ type: emailTemplatePreviewTypeSchema })
        .parse(request.params);
      const preview =
        await dependencies.settingsService.previewEmailTemplate(type);
      return emailTemplatePreviewResponseSchema.parse(preview);
    },
  });

  server.route({
    config: { access: adminPreviewDraftEmailTemplateRoute.access },
    method: adminPreviewDraftEmailTemplateRoute.method,
    url: adminPreviewDraftEmailTemplateRoute.url,
    async handler(request) {
      const { type } = z
        .object({ type: emailTemplatePreviewTypeSchema })
        .parse(request.params);
      const draft = emailTemplatePreviewRequestSchema.parse(request.body);
      const preview = await dependencies.settingsService.previewEmailTemplate(
        type,
        draft,
      );
      return emailTemplatePreviewResponseSchema.parse(preview);
    },
  });

  server.route({
    config: { access: locationGetSettingsRoute.access },
    method: locationGetSettingsRoute.method,
    url: locationGetSettingsRoute.url,
    async handler(request) {
      const { locationId } = locationParamsSchema.parse(request.params);
      const userId = getAuthenticatedUserId(request);
      await dependencies.permissionService.assertHasPermission({
        locationId,
        permission: "settings.location_documents.manage",
        user: { userId },
      });
      const settings =
        await dependencies.settingsService.getLocationSettings(locationId);
      return locationDocumentSettingsResponseSchema.parse(settings);
    },
  });

  server.route({
    config: { access: locationUpdateSettingsRoute.access },
    method: locationUpdateSettingsRoute.method,
    url: locationUpdateSettingsRoute.url,
    async handler(request) {
      const { locationId } = locationParamsSchema.parse(request.params);
      const userId = getAuthenticatedUserId(request);
      await dependencies.permissionService.assertHasPermission({
        locationId,
        permission: "settings.location_documents.manage",
        user: { userId },
      });
      const patch = updateLocationDocumentSettingsRequestSchema.parse(
        request.body,
      );
      const settings =
        await dependencies.settingsService.updateLocationSettings({
          actor: getAuthenticatedActor(request),
          locationId,
          now: new Date(),
          patch,
          updatedBy: userId,
        });
      return locationDocumentSettingsResponseSchema.parse(settings);
    },
  });
}

function createUnavailableDependencies(): OfficialDocumentSettingsRouteDependencies {
  return {
    permissionService: {
      async assertHasPermission() {
        throw unavailableSettingsError();
      },
    },
    settingsService: {
      async getGlobalSettings() {
        throw unavailableSettingsError();
      },
      async getLocationSettings() {
        throw unavailableSettingsError();
      },
      async previewEmailTemplate() {
        throw unavailableSettingsError();
      },
      async resolveDocumentProfile() {
        throw unavailableSettingsError();
      },
      async updateGlobalSettings() {
        throw unavailableSettingsError();
      },
      async updateLocationSettings() {
        throw unavailableSettingsError();
      },
    },
  };
}

function unavailableSettingsError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Official document settings services are not configured.",
    statusCode: 503,
    title: "Document settings unavailable",
  });
}
