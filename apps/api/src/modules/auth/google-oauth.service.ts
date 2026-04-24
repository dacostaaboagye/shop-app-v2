import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as oidc from "openid-client";
import { AppError } from "../_core/errors/app-error.js";
import type {
  AuthUserRecord,
  IssuedSession,
  SessionIssuer,
} from "./authentication.service.js";
import type { SessionContext } from "./authentication-records.js";

const OAUTH_STATE_COOKIE = "shop_oauth_state";
const OAUTH_CODE_VERIFIER_COOKIE = "shop_oauth_verifier";
const GOOGLE_ISSUER = new URL("https://accounts.google.com");

export interface GoogleOAuthRepository {
  findUserByOAuthIdentity(
    provider: string,
    providerUserId: string,
  ): Promise<AuthUserRecord | null>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  createOAuthUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatarUrl: string | null;
    provider: string;
    providerUserId: string;
    providerEmail: string;
    now: Date;
  }): Promise<AuthUserRecord>;
  linkOAuthIdentity(input: {
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail: string;
    displayName: string | null;
    avatarUrl: string | null;
    now: Date;
  }): Promise<void>;
  markSuccessfulLogin(userId: string, occurredAt: Date): Promise<void>;
}

export class GoogleOAuthService {
  private configCache: oidc.Configuration | null = null;

  constructor(
    private readonly repository: GoogleOAuthRepository,
    private readonly sessionIssuer: SessionIssuer,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly callbackUrl: string,
    readonly _webBaseUrl: string,
    private readonly cookieSecure: boolean,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Sets the OAuth state + PKCE cookies and returns the Google consent URL.
   */
  async initiateFlow(reply: FastifyReply): Promise<string> {
    const config = await this.getConfig();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = randomBytes(24).toString("base64url");

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: this.cookieSecure,
      maxAge: 600, // 10 minutes
      path: "/",
    };

    reply.setCookie(OAUTH_STATE_COOKIE, state, cookieOptions);
    reply.setCookie(OAUTH_CODE_VERIFIER_COOKIE, codeVerifier, cookieOptions);

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: this.callbackUrl,
      scope: "openid email profile",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });

    return redirectTo.href;
  }

  /**
   * Handles the callback from Google. Validates state, exchanges the code,
   * finds or creates the user, and issues a session.
   */
  async handleCallback(
    request: FastifyRequest,
    reply: FastifyReply,
    context?: SessionContext,
  ): Promise<IssuedSession> {
    const query = request.query as Record<string, string>;
    const oauthError = query.error;

    if (oauthError) {
      throw new AppError({
        code: "unauthorized",
        statusCode: 400,
        title: "Google sign-in failed",
        detail: "Google returned an error during sign-in. Please try again.",
      });
    }

    const storedState = request.cookies[OAUTH_STATE_COOKIE];
    const codeVerifier = request.cookies[OAUTH_CODE_VERIFIER_COOKIE];

    // Clear state cookies immediately
    reply.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
    reply.clearCookie(OAUTH_CODE_VERIFIER_COOKIE, { path: "/" });

    if (!storedState || !codeVerifier) {
      throw new AppError({
        code: "unauthorized",
        statusCode: 400,
        title: "Invalid OAuth state",
        detail: "The OAuth state is missing or expired. Please try again.",
      });
    }

    const config = await this.getConfig();

    // Build the current URL from the request for openid-client to parse
    const protocol = this.cookieSecure ? "https" : "http";
    const host = request.headers.host ?? "localhost";
    const currentUrl = new URL(`${protocol}://${host}${request.url}`);

    // Exchange authorization code for tokens
    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState: storedState,
    });

    const claims = tokens.claims();

    if (!claims) {
      throw new AppError({
        code: "unauthorized",
        statusCode: 400,
        title: "Google sign-in failed",
        detail: "Could not extract identity claims from Google.",
      });
    }

    const providerUserId = claims.sub;
    const email = claims.email as string | undefined;
    const emailVerifiedByProvider = claims.email_verified as
      | boolean
      | undefined;
    const name = claims.name as string | undefined;
    const picture = claims.picture as string | undefined;

    if (!email || !emailVerifiedByProvider) {
      throw new AppError({
        code: "unauthorized",
        statusCode: 400,
        title: "Unverified Google email",
        detail: "Your Google account email must be verified to sign in.",
      });
    }

    const now = this.now();
    const user = await this.findOrCreateUser({
      providerUserId,
      email,
      name: name ?? email,
      avatarUrl: picture ?? null,
      now,
    });

    await this.repository.markSuccessfulLogin(user.id, now);

    return this.sessionIssuer.issueSession(user, now, context);
  }

  private async findOrCreateUser(input: {
    providerUserId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    now: Date;
  }): Promise<AuthUserRecord> {
    // 1. Exact OAuth identity match
    const byIdentity = await this.repository.findUserByOAuthIdentity(
      "google",
      input.providerUserId,
    );
    if (byIdentity) return byIdentity;

    // 2. Email match — link the OAuth identity to the existing account
    const byEmail = await this.repository.findUserByEmail(
      input.email.toLowerCase(),
    );
    if (byEmail) {
      await this.repository.linkOAuthIdentity({
        userId: byEmail.id,
        provider: "google",
        providerUserId: input.providerUserId,
        providerEmail: input.email,
        displayName: input.name,
        avatarUrl: input.avatarUrl,
        now: input.now,
      });
      return byEmail;
    }

    // 3. New user — create account with Google identity (email pre-verified)
    const nameParts = input.name.split(" ");
    const firstName = nameParts[0] ?? input.name;
    const lastName = nameParts.slice(1).join(" ") || firstName;

    return this.repository.createOAuthUser({
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

  private async getConfig(): Promise<oidc.Configuration> {
    if (!this.configCache) {
      this.configCache = await oidc.discovery(
        GOOGLE_ISSUER,
        this.clientId,
        this.clientSecret,
      );
    }
    return this.configCache;
  }
}
