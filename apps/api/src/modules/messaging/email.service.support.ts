export function buildOperationalEmailContent(input: {
  firstName?: string | null;
  messageBody: string;
}) {
  const greeting = input.firstName?.trim()
    ? `Hi ${input.firstName.trim()},`
    : "Hello,";
  const html = [
    "<!DOCTYPE html>",
    '<html><body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">',
    `<p>${escapeHtml(greeting)}</p>`,
    ...input.messageBody
      .trim()
      .split(/\r?\n\r?\n/)
      .map(
        (paragraph) =>
          `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`,
      ),
    "<p>Reply to this email if you need help.</p>",
    "</body></html>",
  ].join("");
  const text = [
    greeting,
    "",
    input.messageBody.trim(),
    "",
    "Reply to this email if you need help.",
  ].join("\n");

  return { html, text };
}

export function buildSalesDocumentEmailContent(input: {
  documentLabel: string;
  documentReference: string;
  locationName?: string | null;
  profileEmail?: string | null;
  recipientName?: string | null;
  supportFallbackEmail: string;
}) {
  const greeting = input.recipientName?.trim()
    ? `Hi ${input.recipientName.trim()},`
    : "Hello,";
  const subject = `${input.documentLabel} ${input.documentReference}`;
  const supportEmail = input.profileEmail?.trim() || input.supportFallbackEmail;
  const locationLine = input.locationName?.trim()
    ? ` from ${input.locationName.trim()}`
    : "";
  const html = [
    "<!DOCTYPE html>",
    '<html><body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">',
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>Your ${escapeHtml(input.documentLabel.toLowerCase())} for ${escapeHtml(input.documentReference)}${escapeHtml(locationLine)} is attached as a PDF.</p>`,
    "<p>If you need help with this document, reply to this email.</p>",
    `<p>Support: ${escapeHtml(supportEmail)}</p>`,
    "</body></html>",
  ].join("");
  const text = [
    greeting,
    "",
    `Your ${input.documentLabel.toLowerCase()} for ${input.documentReference}${locationLine} is attached as a PDF.`,
    "If you need help with this document, reply to this email.",
    `Support: ${supportEmail}`,
  ].join("\n");

  return { html, subject, text };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
