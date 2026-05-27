import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-foreground",
        accent: "border-accent/40 bg-accent/10 text-accent",
        warning: "border-amber-500/40 bg-amber-500/10 text-amber-400",
        success: "border-green-500/40 bg-green-500/10 text-green-400",
        info: "border-sky-500/40 bg-sky-500/10 text-sky-400",
        muted: "border-border bg-transparent text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
