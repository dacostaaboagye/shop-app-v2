"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-trigger" className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group/trigger flex flex-1 items-center justify-between py-2 text-left transition-all outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronRightIcon className="text-muted-foreground/60 size-3.5 shrink-0 transition-transform duration-300 ease-in-out group-data-open/trigger:rotate-90" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(
        "grid grid-rows-[0fr] transition-[grid-template-rows,opacity] duration-300 ease-in-out data-open:grid-rows-[1fr] data-open:opacity-100 data-closed:opacity-0",
        className,
      )}
      {...props}
    >
      <div className="overflow-hidden">{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
