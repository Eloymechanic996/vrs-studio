import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white hover:bg-accent-hover shadow-[0_4px_24px_-4px_var(--color-accent-glow)]",
        secondary:
          "bg-surface border border-border text-foreground hover:bg-surface-hover",
        ghost: "text-muted hover:text-foreground hover:bg-surface",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-surface",
        danger: "bg-red-700/90 text-white hover:bg-red-700",
        success: "bg-green-700/90 text-white hover:bg-green-700",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
