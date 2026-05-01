/**
 * Mask an email address for log output. Keeps the first character of the
 * local part and the full domain so operators can still triage sender vs
 * recipient buckets, but the full address is not retrievable.
 *
 * `ada.lovelace@example.com` → `a***@example.com`
 */
export function maskEmailForLog(value: string | null | undefined): string {
  if (!value) return "(no recipient)";
  const trimmed = value.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "(invalid)";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  const head = local.charAt(0);
  return `${head}***${domain}`;
}

/**
 * Returns the byte length of a string (utf-8). Used to log a size hint
 * instead of the full content, e.g. email bodies in console-fallback mode.
 */
export function byteLength(value: string | null | undefined): number {
  if (!value) return 0;
  return Buffer.byteLength(value, "utf8");
}
