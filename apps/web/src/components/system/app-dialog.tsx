"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const APP_DIALOG_SIZE_CLASSES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

type AppDialogProps = {
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  showCloseButton?: boolean;
  size?: keyof typeof APP_DIALOG_SIZE_CLASSES;
  title: ReactNode;
};

type AppDialogBodyProps = {
  children: ReactNode;
  className?: string;
};

type AppDialogActionsProps = {
  children: ReactNode;
  className?: string;
};

export function AppDialog({
  children,
  description,
  footer,
  onOpenChange,
  open,
  showCloseButton = true,
  size = "md",
  title,
}: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("gap-0 p-0", APP_DIALOG_SIZE_CLASSES[size])}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className="gap-2 border-b px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export function AppDialogBody({ children, className }: AppDialogBodyProps) {
  return (
    <div
      className={cn(
        "flex max-h-[min(72vh,44rem)] flex-col gap-4 overflow-y-auto px-5 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AppDialogActions({
  children,
  className,
}: AppDialogActionsProps) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}
