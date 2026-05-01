import { AppError } from "../_core/errors/app-error.js";
import type { AuthUserRecord } from "./authentication.service.js";
import type { GoogleOAuthRepository } from "./google-oauth.service.js";

export type ResolveGoogleOAuthUserInput = {
  providerUserId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  now: Date;
};

/**
 * Refuses to silently link Google to an existing email-only account: an
 * attacker who pre-registered the victim's email with a password could
 * otherwise hijack the account by letting the real owner complete OAuth.
 * Account linking must originate from an authenticated session.
 */
export async function resolveGoogleOAuthUser(
  repository: GoogleOAuthRepository,
  input: ResolveGoogleOAuthUserInput,
): Promise<AuthUserRecord> {
  const byIdentity = await repository.findUserByOAuthIdentity(
    "google",
    input.providerUserId,
  );
  if (byIdentity) return byIdentity;

  const byEmail = await repository.findUserByEmail(input.email.toLowerCase());
  if (byEmail) {
    throw new AppError({
      code: "conflict",
      statusCode: 409,
      title: "Account already exists",
      detail:
        "An account with this email already exists. Sign in with your existing credentials, then link Google from account settings.",
      details: { oauthError: "account_exists" },
    });
  }

  const nameParts = input.name.split(" ");
  const firstName = nameParts[0] ?? input.name;
  const lastName = nameParts.slice(1).join(" ") || firstName;

  return repository.createOAuthUser({
    email: input.email.toLowerCase(),
    firstName,
    lastName,
    displayName: input.name,
    avatarUrl: input.avatarUrl,
    provider: "google",
    providerUserId: input.providerUserId,
    providerEmail: input.email,
    now: input.now,
  });
}
