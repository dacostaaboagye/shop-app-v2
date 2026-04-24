import type { EmailTemplateDefinition } from "@shop/database";
import {
  type EmailTemplateBrand,
  emailHtml,
  emailText,
} from "./email-html-layout.js";

export type { EmailTemplateBrand };
export type EmailTemplateVariables = Record<string, string>;

export function renderConfiguredEmailTemplate(input: {
  actionUrl: string;
  brand: EmailTemplateBrand;
  template: EmailTemplateDefinition;
  variables: EmailTemplateVariables;
}) {
  const subject = renderTemplate(input.template.subject, input.variables);
  const heading = renderTemplate(input.template.heading, input.variables);
  const intro = renderTemplate(input.template.intro, input.variables);
  const actionLabel = renderTemplate(
    input.template.actionLabel,
    input.variables,
  );
  const footer = renderTemplate(input.template.footer, input.variables);

  return {
    html: emailHtml({
      actionLabel,
      actionUrl: input.actionUrl,
      brand: input.brand,
      footer,
      heading,
      intro,
    }),
    subject,
    text: emailText({
      actionLabel,
      actionUrl: input.actionUrl,
      footer,
      heading,
      intro,
    }),
  };
}

export function findTemplateVariables(
  template: EmailTemplateDefinition,
): string[] {
  const variables = new Set<string>();
  for (const value of Object.values(template)) {
    for (const match of value.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
      const variable = match[1];
      if (variable) variables.add(variable);
    }
  }
  return [...variables].sort((left, right) => left.localeCompare(right));
}

function renderTemplate(
  template: string,
  variables: EmailTemplateVariables,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return variables[key] ?? "";
  });
}
