import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../modules/_core/errors/app-error.js";
import { toProblemDetails } from "../modules/_core/errors/to-problem-details.js";

type GlobalRateLimitOptions = {
  max: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const MAX_BUCKETS = 10_000;

export function registerGlobalRateLimit(
  server: FastifyInstance,
  options: GlobalRateLimitOptions,
): void {
  const buckets = new Map<string, RateLimitBucket>();

  server.addHook("onRequest", (request, reply, done) => {
    const now = Date.now();
    const bucket = getBucket(buckets, request.ip, now, options.windowMs);
    bucket.count += 1;

    if (bucket.count <= options.max) {
      done();
      return;
    }

    sendRateLimitedResponse(request, reply, bucket.resetAt, now);
  });
}

function getBucket(
  buckets: Map<string, RateLimitBucket>,
  key: string,
  now: number,
  windowMs: number,
): RateLimitBucket {
  if (buckets.size > MAX_BUCKETS) {
    pruneExpiredBuckets(buckets, now);
  }

  const existing = buckets.get(key);

  if (existing && existing.resetAt > now) {
    return existing;
  }

  const next = { count: 0, resetAt: now + windowMs };
  buckets.set(key, next);
  return next;
}

function pruneExpiredBuckets(
  buckets: Map<string, RateLimitBucket>,
  now: number,
): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function sendRateLimitedResponse(
  request: FastifyRequest,
  reply: FastifyReply,
  resetAt: number,
  now: number,
): void {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  const problem = toProblemDetails(
    new AppError({
      code: "rate_limited",
      detail:
        "Too many requests were received from this client. Please wait and try again.",
      statusCode: 429,
      title: "Too Many Requests",
    }),
    request,
  );

  reply
    .header("retry-after", String(retryAfterSeconds))
    .status(problem.status)
    .send(problem);
}
