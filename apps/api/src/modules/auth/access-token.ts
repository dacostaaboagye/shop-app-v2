import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../_core/errors/app-error.js";

// JWT NumericDate per RFC 7519: seconds since the Unix epoch.
type AccessTokenPayload = {
  expires_at: number;
  issued_at: number;
  slug: string;
  user_id: string;
};

export type VerifiedAccessToken = {
  expiresAt: Date;
  issuedAt: Date;
  userId: string;
  userSlug: string;
};

export type AccessTokenIssueInput = {
  expiresInSeconds: number;
  now: Date;
  secret: string;
  userId: string;
  userSlug: string;
};

export type IssuedAccessToken = {
  expiresAt: Date;
  token: string;
};

const header = {
  alg: "HS256",
  typ: "JWT",
} as const;

export function issueAccessToken(
  input: AccessTokenIssueInput,
): IssuedAccessToken {
  const issuedAt = toEpochSeconds(input.now);
  const expiresAt = issuedAt + input.expiresInSeconds;
  const payload: AccessTokenPayload = {
    expires_at: expiresAt,
    issued_at: issuedAt,
    slug: input.userSlug,
    user_id: input.userId,
  };

  const encodedHeader = encodeJson(header);
  const encodedPayload = encodeJson(payload);
  const signature = signToken(
    `${encodedHeader}.${encodedPayload}`,
    input.secret,
  );

  return {
    expiresAt: new Date(expiresAt * 1000),
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
  };
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signToken(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function verifyAccessToken(input: {
  now: Date;
  secret: string;
  token: string;
}): VerifiedAccessToken {
  const [encodedHeader, encodedPayload, signature] = input.token.split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    throw invalidAccessTokenError();
  }

  const expectedSignature = signToken(
    `${encodedHeader}.${encodedPayload}`,
    input.secret,
  );

  if (!signaturesMatch(signature, expectedSignature)) {
    throw invalidAccessTokenError();
  }

  const payload = parsePayload(encodedPayload);
  const nowSeconds = toEpochSeconds(input.now);

  if (
    payload.expires_at <= payload.issued_at ||
    payload.expires_at <= nowSeconds
  ) {
    throw invalidAccessTokenError();
  }

  return {
    expiresAt: new Date(payload.expires_at * 1000),
    issuedAt: new Date(payload.issued_at * 1000),
    userId: payload.user_id,
    userSlug: payload.slug,
  };
}

function toEpochSeconds(date: Date): number {
  return date.getTime() / 1000;
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function parsePayload(encodedPayload: string): AccessTokenPayload {
  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.expires_at !== "number" ||
      typeof payload.issued_at !== "number" ||
      typeof payload.slug !== "string" ||
      typeof payload.user_id !== "string"
    ) {
      throw invalidAccessTokenError();
    }

    return payload satisfies AccessTokenPayload;
  } catch {
    throw invalidAccessTokenError();
  }
}

function invalidAccessTokenError(): AppError {
  return new AppError({
    code: "unauthorized",
    detail: "The access token is invalid or has expired.",
    statusCode: 401,
    title: "Invalid access token",
  });
}
