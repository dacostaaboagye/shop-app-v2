import {
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AuthRouteDependencies } from "./auth-route-support.js";
import { getAuthenticatedUserId } from "./auth-route-support.js";
import { clearRefreshTokenCookie } from "./refresh-token-cookie.js";

const verifyEmailRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "POST",
  url: "/api/auth/verify-email",
};

const resendVerificationRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "POST",
  url: "/api/auth/resend-verification",
};

const forgotPasswordRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "POST",
  url: "/api/auth/forgot-password",
};

const resetPasswordRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "POST",
  url: "/api/auth/reset-password",
};

export function registerRecoveryRoutes(
  server: FastifyInstance,
  dependencies: AuthRouteDependencies,
) {
  server.route({
    config: {
      access: verifyEmailRoute.access,
      rateLimit: { max: 10, timeWindow: "1 hour" },
    },
    method: verifyEmailRoute.method,
    url: verifyEmailRoute.url,
    async handler(request, reply) {
      const { token } = verifyEmailRequestSchema.parse(request.body);
      await dependencies.emailVerificationService.verify(token);
      return reply.status(200).send({ ok: true });
    },
  });

  server.route({
    config: {
      access: resendVerificationRoute.access,
      rateLimit: { max: 5, timeWindow: "1 hour" },
    },
    method: resendVerificationRoute.method,
    url: resendVerificationRoute.url,
    async handler(request, reply) {
      await dependencies.emailVerificationService.resend(
        getAuthenticatedUserId(request),
      );
      return reply.status(204).send();
    },
  });

  server.route({
    config: {
      access: forgotPasswordRoute.access,
      rateLimit: { max: 3, timeWindow: "1 hour" },
    },
    method: forgotPasswordRoute.method,
    url: forgotPasswordRoute.url,
    async handler(request, reply) {
      const { email } = forgotPasswordRequestSchema.parse(request.body);
      await dependencies.passwordResetService.initiateReset(email);
      // Always 200 — never reveal whether the email is registered
      return reply.status(200).send({ ok: true });
    },
  });

  server.route({
    config: {
      access: resetPasswordRoute.access,
      rateLimit: { max: 5, timeWindow: "1 hour" },
    },
    method: resetPasswordRoute.method,
    url: resetPasswordRoute.url,
    async handler(request, reply) {
      const { token, newPassword } = resetPasswordRequestSchema.parse(
        request.body,
      );
      await dependencies.passwordResetService.resetPassword(token, newPassword);
      clearRefreshTokenCookie(reply);
      return reply.status(200).send({ ok: true });
    },
  });
}
