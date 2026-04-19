import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../modules/_core/errors/app-error.js";
import {
  toProblemDetails,
  toUnexpectedProblemDetails,
} from "../modules/_core/errors/to-problem-details.js";

export function registerErrorHandling(server: FastifyInstance) {
  server.setNotFoundHandler((request, reply) => {
    const problem = toProblemDetails(
      new AppError({
        code: "not_found",
        statusCode: 404,
        title: "Resource Not Found",
        detail: `No route matched ${request.method} ${request.url}.`,
      }),
      request,
    );

    return reply.status(problem.status).send(problem);
  });

  server.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      const problem = toProblemDetails(error, request);
      return reply.status(problem.status).send(problem);
    }

    if (error instanceof ZodError) {
      const detail = error.issues
        .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
        .join("; ");
      const problem = toProblemDetails(
        new AppError({
          code: "validation_error",
          statusCode: 400,
          title: "Validation Error",
          detail,
        }),
        request,
      );
      return reply.status(400).send(problem);
    }

    request.log.error({ err: error }, "Unhandled request failure");
    const problem = toUnexpectedProblemDetails(request);
    return reply.status(problem.status).send(problem);
  });
}
