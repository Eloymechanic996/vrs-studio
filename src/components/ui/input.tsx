import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-border bg-surface/60 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full rounded-md border border-border bg-surface/60 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-y",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-border bg-surface/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-xs font-medium uppercase tracking-wider text-muted",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted/70">{hint}</p> : null}
    </div>
  );
}
