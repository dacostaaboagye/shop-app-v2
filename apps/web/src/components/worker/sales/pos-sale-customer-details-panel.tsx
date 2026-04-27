"use client";

import { ReceiptText } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PosSaleCustomerDetails } from "./pos-sale-customer-details.support";

type Props = {
  details: PosSaleCustomerDetails;
  onChange: (details: PosSaleCustomerDetails) => void;
};

export function PosSaleCustomerDetailsPanel({ details, onChange }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Accordion defaultValue={[]}>
        <AccordionItem className="px-4" value="buyer-details">
          <AccordionTrigger className="gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ReceiptText className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">Buyer Details</span>
                  <Badge className="rounded-md border-none bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-none">
                    Optional
                  </Badge>
                </div>
                <p className="type-support">
                  Add invoice details only when this sale needs named customer
                  information.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 pb-4 pt-1 lg:grid-cols-2">
              <AppFormField
                description="Shown on the invoice when a named buyer is required."
                inputId="pos-sale-customer-name"
                label="Buyer Name"
              >
                <Input
                  id="pos-sale-customer-name"
                  onChange={(event) =>
                    onChange({ ...details, name: event.target.value })
                  }
                  placeholder="Enter buyer name"
                  value={details.name}
                />
              </AppFormField>
              <AppFormField
                description="Used for invoice contact details when provided."
                inputId="pos-sale-customer-email"
                label="Buyer Email"
              >
                <Input
                  id="pos-sale-customer-email"
                  onChange={(event) =>
                    onChange({ ...details, email: event.target.value })
                  }
                  placeholder="buyer@example.com"
                  type="email"
                  value={details.email}
                />
              </AppFormField>
              <AppFormField
                description="Used for invoice contact details when provided."
                inputId="pos-sale-customer-phone"
                label="Buyer Phone"
              >
                <Input
                  id="pos-sale-customer-phone"
                  onChange={(event) =>
                    onChange({ ...details, phone: event.target.value })
                  }
                  placeholder="+233200000000"
                  value={details.phone}
                />
              </AppFormField>
              <AppFormField
                description="Useful when the buyer needs tax information on the invoice."
                inputId="pos-sale-customer-tax-number"
                label="Buyer Tax Number"
              >
                <Input
                  id="pos-sale-customer-tax-number"
                  onChange={(event) =>
                    onChange({ ...details, taxNumber: event.target.value })
                  }
                  placeholder="TIN-123"
                  value={details.taxNumber}
                />
              </AppFormField>
              <div className="lg:col-span-2">
                <AppFormField
                  description="Enter one address line per row when the invoice needs billing details."
                  inputId="pos-sale-customer-address"
                  label="Billing Address"
                >
                  <Textarea
                    className="min-h-[96px] resize-none"
                    id="pos-sale-customer-address"
                    onChange={(event) =>
                      onChange({
                        ...details,
                        billingAddress: event.target.value,
                      })
                    }
                    placeholder={"12 Market Street\nAccra"}
                    value={details.billingAddress}
                  />
                </AppFormField>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
