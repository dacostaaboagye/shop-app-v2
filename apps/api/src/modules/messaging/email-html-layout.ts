export type EmailTemplateBrand = {
  accentColor: string;
  brandName: string;
  fromAddress: string;
  logoImageUrl: string | null;
  logoText: string;
  primaryColor: string;
  supportEmail: string;
};

export function emailHtml(input: {
  actionLabel: string;
  actionUrl: string;
  brand: EmailTemplateBrand;
  footer: string;
  heading: string;
  intro: string;
}): string {
  const supportEmailBlock = supportEmailHtml(input.brand);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    body, table, td, p, a {
      font-family: Arial, Helvetica, sans-serif !important;
    }
    a {
      text-decoration: none;
    }
    .email-word-break {
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    @media only screen and (max-width: 620px) {
      .email-shell {
        width: 100% !important;
        max-width: 100% !important;
      }
      .email-outer {
        padding: 20px 12px 32px !important;
      }
      .email-card {
        border-radius: 14px !important;
      }
      .email-body {
        padding: 24px 18px 24px !important;
      }
      .email-heading {
        font-size: 30px !important;
        line-height: 1.15 !important;
      }
      .email-copy {
        font-size: 16px !important;
      }
      .email-brand-row,
      .email-brand-logo-cell,
      .email-brand-copy-cell {
        display: block !important;
        width: 100% !important;
      }
      .email-brand-spacer {
        display: none !important;
        width: 0 !important;
      }
      .email-brand-copy-cell {
        padding-top: 16px !important;
      }
      .email-button {
        display: block !important;
        width: 100% !important;
      }
      .email-button td {
        display: block !important;
        width: 100% !important;
      }
      .email-button a {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: #0f172a !important;
      }
      .email-card {
        background: #111827 !important;
        border-color: #374151 !important;
      }
      .email-heading,
      .email-brand {
        color: #f9fafb !important;
      }
      .email-muted,
      .email-footer,
      .email-link {
        color: #d1d5db !important;
      }
      .email-divider {
        background: #374151 !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;background:#f5f7fb;">
    <tr>
      <td class="email-outer" align="center" style="padding:32px 20px 48px;">
        <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;border-collapse:separate;">
          <tr>
            <td class="email-card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:6px;font-size:0;line-height:0;background:${escapeHtml(input.brand.primaryColor)};"></td>
                </tr>
                <tr>
                  <td class="email-body" style="padding:28px 24px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:0 0 28px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                            <tr class="email-brand-row">
                              <td class="email-brand-logo-cell" style="vertical-align:middle;">${brandLogoHtml(input.brand)}</td>
                              <td class="email-brand-spacer" style="width:18px;font-size:0;line-height:0;">&nbsp;</td>
                              <td class="email-brand-copy-cell" style="vertical-align:middle;padding-top:2px;">
                                <p class="email-brand email-word-break" style="margin:0 0 6px;font-size:22px;line-height:1.2;font-weight:700;color:#111827;">${escapeHtml(input.brand.brandName)}</p>
                                <p class="email-muted email-word-break" style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">${escapeHtml(input.brand.fromAddress)}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 24px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                            <tr>
                              <td style="width:72px;height:6px;border-radius:999px;font-size:0;line-height:0;background:${escapeHtml(input.brand.accentColor)};"></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 16px;">
                          <h1 class="email-heading email-word-break" style="margin:0;font-size:40px;line-height:1.05;font-weight:700;color:#111827;">${escapeHtml(input.heading)}</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 28px;">
                          <p class="email-copy email-muted email-word-break" style="margin:0;font-size:18px;line-height:1.6;color:#374151;">${escapeHtml(input.intro)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 32px;">
                          <table role="presentation" class="email-button" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
                            <tr>
                              <td align="center" bgcolor="${escapeHtml(input.brand.primaryColor)}" style="border-radius:10px;background:${escapeHtml(input.brand.primaryColor)};">
                                <a href="${escapeHtml(input.actionUrl)}" class="email-word-break" style="display:inline-block;padding:14px 24px;font-size:15px;line-height:1.4;font-weight:700;color:#ffffff;text-align:center;">${escapeHtml(input.actionLabel)}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 24px;">
                          <div class="email-divider" style="height:1px;background:#e5e7eb;"></div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 14px;">
                          <p class="email-footer email-muted email-word-break" style="margin:0;font-size:15px;line-height:1.7;color:#6b7280;">${escapeHtml(input.footer)}</p>
                        </td>
                      </tr>
                      ${supportEmailBlock}
                      <tr>
                        <td style="padding:0;">
                          <p class="email-link email-word-break" style="margin:0;font-size:12px;line-height:1.7;color:#9ca3af;">Or copy this link: ${escapeHtml(input.actionUrl)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailText(input: {
  actionLabel: string;
  actionUrl: string;
  footer: string;
  heading: string;
  intro: string;
}): string {
  return [
    input.heading,
    "",
    input.intro,
    "",
    `${input.actionLabel}:`,
    input.actionUrl,
    "",
    input.footer,
    "",
    "If the button does not work, copy and paste the full link into your browser.",
  ].join("\n");
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function supportEmailHtml(brand: EmailTemplateBrand): string {
  if (brand.supportEmail === brand.fromAddress) return "";

  return `<tr>
    <td style="padding:0 0 12px;">
      <p class="email-muted email-word-break" style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">Support: ${escapeHtml(brand.supportEmail)}</p>
    </td>
  </tr>`;
}

function brandLogoHtml(brand: EmailTemplateBrand): string {
  if (brand.logoImageUrl) {
    return `<img src="${escapeHtml(brand.logoImageUrl)}" alt="${escapeHtml(brand.brandName)} logo" width="52" height="52" style="display:block;width:52px;height:52px;object-fit:contain;border-radius:10px;">`;
  }

  const abbr = escapeHtml(brand.logoText.slice(0, 4));
  const bg = escapeHtml(brand.primaryColor);
  return `<div style="width:52px;height:52px;border-radius:10px;background:${bg};color:#ffffff;text-align:center;line-height:52px;font-size:18px;font-weight:700;mso-line-height-rule:exactly;">${abbr}</div>`;
}
