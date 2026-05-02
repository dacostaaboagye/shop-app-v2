import {
  adminAddOptionValueRequestSchema,
  adminCreateProductOptionRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { PostgresCatalogProductOptionsRepository } from "./postgres-catalog-product-options.repository.js";

type Deps = {
  optionsRepo: PostgresCatalogProductOptionsRepository;
};

function unavailableError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Product options service is not configured.",
    statusCode: 503,
    title: "Service unavailable",
  });
}

function createUnavailableDeps(): Deps {
  return {
    optionsRepo: {
      createOption() {
        throw unavailableError();
      },
      deleteOption() {
        throw unavailableError();
      },
      addOptionValue() {
        throw unavailableError();
      },
      deleteOptionValue() {
        throw unavailableError();
      },
    } as unknown as PostgresCatalogProductOptionsRepository,
  };
}

const createOptionRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "POST",
  url: "/api/admin/catalog/products/:slug/options",
};

const deleteOptionRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "DELETE",
  url: "/api/admin/catalog/products/:slug/options/:optionId",
};

const addValueRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "POST",
  url: "/api/admin/catalog/products/:slug/options/:optionId/values",
};

const deleteValueRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "DELETE",
  url: "/api/admin/catalog/products/:slug/options/:optionId/values/:valueId",
};

export function registerCatalogProductOptionsRoutes(
  server: FastifyInstance,
  deps: Deps = createUnavailableDeps(),
) {
  server.route({
    config: { access: createOptionRoute.access },
    method: createOptionRoute.method,
    url: createOptionRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const payload = adminCreateProductOptionRequestSchema.parse(request.body);
      const actor = getAuthenticatedActor(request);
      return deps.optionsRepo.createOption(slug, payload, {
        actorId: actor.userId,
        now: new Date(),
      });
    },
  });

  server.route({
    config: { access: deleteOptionRoute.access },
    method: deleteOptionRoute.method,
    url: deleteOptionRoute.url,
    async handler(request, reply) {
      const { slug, optionId } = request.params as {
        slug: string;
        optionId: string;
      };
      const actor = getAuthenticatedActor(request);
      await deps.optionsRepo.deleteOption(slug, optionId, {
        actorId: actor.userId,
        now: new Date(),
      });
      return reply.status(204).send();
    },
  });

  server.route({
    config: { access: addValueRoute.access },
    method: addValueRoute.method,
    url: addValueRoute.url,
    async handler(request) {
      const { optionId } = request.params as { optionId: string };
      const payload = adminAddOptionValueRequestSchema.parse(request.body);
      const actor = getAuthenticatedActor(request);
      return deps.optionsRepo.addOptionValue(optionId, payload, {
        actorId: actor.userId,
        now: new Date(),
      });
    },
  });

  server.route({
    config: { access: deleteValueRoute.access },
    method: deleteValueRoute.method,
    url: deleteValueRoute.url,
    async handler(request, reply) {
      const { optionId, valueId } = request.params as {
        optionId: string;
        valueId: string;
      };
      const actor = getAuthenticatedActor(request);
      await deps.optionsRepo.deleteOptionValue(optionId, valueId, {
        actorId: actor.userId,
        now: new Date(),
      });
      return reply.status(204).send();
    },
  });
}
