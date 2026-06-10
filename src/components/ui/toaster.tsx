"use client";

import React from "react";
import { useToast, ToastProps } from "@/hooks/use-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm px-4 md:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: ToastProps;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { id, title, description, variant = "default" } = toast;

  const getVariantIcon = () => {
    switch (variant) {
      case "success":
        return <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />;
      case "destructive":
        return <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />;
      default:
        return <Info className="h-4.5 w-4.5 text-primary shrink-0" />;
    }
  };

  return (
    <div
      className="flex items-start gap-3 w-full bg-white border border-border rounded-lg p-3.5 shadow-sm animate-in slide-in-from-bottom-5 fade-in duration-200"
      role="alert"
    >
      {/* Icon */}
      <div className="mt-0.5">{getVariantIcon()}</div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        {title && <p className="text-xs font-semibold text-foreground leading-none">{title}</p>}
        {description && <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>}
      </div>

      {/* Dismiss Button */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onDismiss(id)}
        className="text-muted-foreground hover:text-foreground shrink-0 -mt-1 -mr-1"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
