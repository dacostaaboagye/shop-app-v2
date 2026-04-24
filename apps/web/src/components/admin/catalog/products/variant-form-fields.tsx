"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VariantFormApi } from "./variant-form.api";
import { VariantFormCoreFields } from "./variant-form-core-fields";
import { VariantFormOperationsFields } from "./variant-form-operations-fields";
import { VariantFormPricingFields } from "./variant-form-pricing-fields";

type VariantFormFieldsProps = {
  canSeeCostPrice: boolean;
  form: VariantFormApi;
  showErrors: boolean;
};

export function VariantFormFields({
  canSeeCostPrice,
  form,
  showErrors,
}: VariantFormFieldsProps) {
  const [tab, setTab] = useState("core");

  return (
    <Tabs onValueChange={setTab} value={tab}>
      <TabsList>
        <TabsTrigger value="core">Core</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="operations">Operations</TabsTrigger>
      </TabsList>

      <TabsContent className="pt-2" value="core">
        <VariantFormCoreFields form={form} showErrors={showErrors} />
      </TabsContent>
      <TabsContent className="pt-2" value="pricing">
        <VariantFormPricingFields
          canSeeCostPrice={canSeeCostPrice}
          form={form}
          showErrors={showErrors}
        />
      </TabsContent>
      <TabsContent className="pt-2" value="operations">
        <VariantFormOperationsFields form={form} showErrors={showErrors} />
      </TabsContent>
    </Tabs>
  );
}
