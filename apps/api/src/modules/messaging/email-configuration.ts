import type { EmailTemplateSettings } from "@shop/database";

export type ResolvedEmailConfiguration = {
  brand: {
    accentColor: string;
    brandName: string;
    logoImageUrl: string | null;
    logoText: string;
    primaryColor: string;
  };
  business: {
    email: string;
  };
  sender: {
    fromAddress: string;
    replyToAddress: string;
    supportEmail: string;
  };
  emailTemplates: EmailTemplateSettings;
};

export function resolveEmailConfiguration(input: {
  brand: ResolvedEmailConfiguration["brand"];
  businessEmail: string;
  emailFromAddress: string;
  emailTemplates: EmailTemplateSettings;
}): ResolvedEmailConfiguration {
  return {
    brand: input.brand,
    business: {
      email: input.businessEmail,
    },
    sender: {
      fromAddress: input.emailFromAddress,
      replyToAddress: input.businessEmail,
      supportEmail: input.businessEmail,
    },
    emailTemplates: input.emailTemplates,
  };
}
