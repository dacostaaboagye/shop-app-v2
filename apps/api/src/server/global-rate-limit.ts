import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../modules/_core/errors/app-error.js";
import { toProblemDetails } from "../modules/_core/errors/to-problem-details.js";

type GlobalRateLimitOptions = {
  max: number;
  windowMs: number;
};

type RouteRateLimitConfig = {
  groupId?: string;
  max: number;
  timeWindow: number | string;
};

type RouteConfigWithRateLimit = {
  rateLimit?: unknown;
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

export function registerConfiguredRouteRateLimit(
  server: FastifyInstance,
): void {
  const buckets = new Map<string, RateLimitBucket>();

  server.addHook("onRequest", (request, reply, done) => {
    const routeRateLimit = getRouteRateLimit(request);

    if (!routeRateLimit) {
      done();
      return;
    }

    const now = Date.now();
    const routeKey = getRouteLimitKey(request, routeRateLimit);
    const windowMs = parseRateLimitWindow(routeRateLimit.timeWindow);
    const bucket = getBucket(buckets, routeKey, now, windowMs);
    bucket.count += 1;

    if (bucket.count <= routeRateLimit.max) {
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

function getRouteRateLimit(
  request: FastifyRequest,
): RouteRateLimitConfig | null {
  const routeConfig = request.routeOptions.config as RouteConfigWithRateLimit;
  const routeRateLimit = routeConfig.rateLimit;

  if (!routeRateLimit || typeof routeRateLimit !== "object") {
    return null;
  }

  if (
    !("max" in routeRateLimit) ||
    !("timeWindow" in routeRateLimit) ||
    typeof routeRateLimit.max !== "number" ||
    (typeof routeRateLimit.timeWindow !== "number" &&
      typeof routeRateLimit.timeWindow !== "string")
  ) {
    return null;
  }

  return {
    ...("groupId" in routeRateLimit &&
    typeof routeRateLimit.groupId === "string"
      ? { groupId: routeRateLimit.groupId }
      : {}),
    max: routeRateLimit.max,
    timeWindow: routeRateLimit.timeWindow,
  };
}

function getRouteLimitKey(
  request: FastifyRequest,
  config: RouteRateLimitConfig,
): string {
  const routePath = request.routeOptions.url ?? request.url;
  const groupKey = config.groupId ?? `${request.method}:${routePath}`;
  return `${request.ip}:${groupKey}`;
}

function parseRateLimitWindow(timeWindow: number | string): number {
  if (typeof timeWindow === "number") {
    return timeWindow;
  }

  const match =
    /^(\d+)\s*(ms|millisecond|milliseconds|s|sec|second|seconds|m|min|minute|minutes|h|hour|hours)$/i.exec(
      timeWindow.trim(),
    );

  if (!match || !match[1] || !match[2]) {
    return 60_000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "ms" || unit.startsWith("millisecond")) {
    return amount;
  }

  if (unit === "s" || unit === "sec" || unit.startsWith("second")) {
    return amount * 1_000;
  }

  if (unit === "m" || unit === "min" || unit.startsWith("minute")) {
    return amount * 60_000;
  }

  if (unit === "h" || unit.startsWith("hour")) {
    return amount * 3_600_000;
  }

  return 60_000;
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
