import type { EmailTemplateSettings } from "@shop/database";

export type LoosePatch<T> = { [K in keyof T]?: T[K] | undefined };

export function mergeDefined<T extends Record<string, unknown>>(
  current: T,
  patch: LoosePatch<T> | undefined,
): T {
  if (!patch) return current;

  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      next[key as keyof T] = value as T[keyof T];
    }
  }
  return next;
}

export function mergeEmailTemplates(
  current: EmailTemplateSettings,
  patch:
    | {
        emailVerification?:
          | LoosePatch<EmailTemplateSettings["emailVerification"]>
          | undefined;
        passwordReset?:
          | LoosePatch<EmailTemplateSettings["passwordReset"]>
          | undefined;
        supplierInvite?:
          | LoosePatch<EmailTemplateSettings["supplierInvite"]>
          | undefined;
      }
    | undefined,
): EmailTemplateSettings {
  if (!patch) return current;
  return {
    emailVerification: mergeDefined(
      current.emailVerification,
      patch.emailVerification,
    ),
    passwordReset: mergeDefined(current.passwordReset, patch.passwordReset),
    supplierInvite: mergeDefined(current.supplierInvite, patch.supplierInvite),
  };
}
