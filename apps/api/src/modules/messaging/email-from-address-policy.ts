/**
 * Asserts that an email's from-address sits on a domain the operator has
 * authorised for sending. Used at boot to validate the configured
 * EMAIL_FROM_ADDRESS against the EMAIL_ALLOWED_FROM_DOMAINS allowlist.
 *
 * The allowlist is opt-in: when empty (no env var configured) the check
 * passes silently — keeps existing deployments working unchanged. Once the
 * operator sets the env, mismatches throw at boot rather than silently
 * letting the API send phishing-shaped mail with a brand name + a
 * domain the operator doesn't own.
 */

export class EmailFromAddressPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailFromAddressPolicyError";
  }
}

export function assertEmailFromAddressAllowed(input: {
  fromAddress: string;
  allowedDomains: readonly string[];
}): void {
  if (input.allowedDomains.length === 0) {
    return;
  }
  const domain = extractEmailDomain(input.fromAddress);
  if (!domain) {
    throw new EmailFromAddressPolicyError(
      `EMAIL_FROM_ADDRESS "${input.fromAddress}" is not a parseable email address.`,
    );
  }
  if (!input.allowedDomains.includes(domain)) {
    throw new EmailFromAddressPolicyError(
      `EMAIL_FROM_ADDRESS domain "${domain}" is not in EMAIL_ALLOWED_FROM_DOMAINS ` +
        `(${input.allowedDomains.join(", ")}). Refusing to send mail from an unverified domain.`,
    );
  }
}

export function extractEmailDomain(address: string): string | null {
  const trimmed = address.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1).toLowerCase();
  // Reject bracketed display-name formats and obviously malformed values.
  if (domain.includes(" ") || domain.includes(",")) return null;
  return domain;
}
