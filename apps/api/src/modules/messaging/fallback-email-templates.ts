import { escapeHtml } from "./email-html-layout.js";

export function verificationEmailHtml(firstName: string, url: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">Verify your email</h1>
  <p style="color: #374151; margin-bottom: 24px;">Hi ${escapeHtml(firstName)}, please verify your email address to unlock full access to your account.</p>
  <a href="${escapeHtml(url)}" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">Verify email address</a>
  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Or copy this link: ${escapeHtml(url)}</p>
</body>
</html>`;
}

export function verificationEmailText(firstName: string, url: string): string {
  return [
    "Verify your email",
    "",
    `Hi ${firstName},`,
    "",
    "Please verify your email address to unlock full access to your account.",
    "",
    "Verify email address:",
    url,
    "",
    "This link expires in 24 hours. If you did not create an account, you can safely ignore this email.",
    "",
    "If the button does not work, copy and paste the full link into your browser.",
  ].join("\n");
}

export function passwordResetEmailHtml(firstName: string, url: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">Reset your password</h1>
  <p style="color: #374151; margin-bottom: 24px;">Hi ${escapeHtml(firstName)}, we received a request to reset your password.</p>
  <a href="${escapeHtml(url)}" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">Reset password</a>
  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Or copy this link: ${escapeHtml(url)}</p>
</body>
</html>`;
}

export function passwordResetEmailText(firstName: string, url: string): string {
  return [
    "Reset your password",
    "",
    `Hi ${firstName},`,
    "",
    "We received a request to reset your password.",
    "",
    "Reset password:",
    url,
    "",
    "This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.",
    "",
    "If the button does not work, copy and paste the full link into your browser.",
  ].join("\n");
}

export function supplierInviteEmailHtml(input: {
  firstName: string;
  setupUrl: string;
  supplierName: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">Supplier portal access</h1>
  <p style="color: #374151; margin-bottom: 24px;">Hi ${escapeHtml(input.firstName)}, you have been invited to manage supplier activity for ${escapeHtml(input.supplierName)}.</p>
  <a href="${escapeHtml(input.setupUrl)}" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">Set up portal access</a>
  <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This link expires in 1 hour. If you were not expecting this invite, contact the business before continuing.</p>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Or copy this link: ${escapeHtml(input.setupUrl)}</p>
</body>
</html>`;
}

export function supplierInviteEmailText(input: {
  firstName: string;
  setupUrl: string;
  supplierName: string;
}): string {
  return [
    "Supplier portal access",
    "",
    `Hi ${input.firstName},`,
    "",
    `You have been invited to manage supplier activity for ${input.supplierName}.`,
    "",
    "Set up portal access:",
    input.setupUrl,
    "",
    "This link expires in 1 hour. If you were not expecting this invite, contact the business before continuing.",
    "",
    "If the button does not work, copy and paste the full link into your browser.",
  ].join("\n");
}
