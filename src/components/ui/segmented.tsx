"use client";

import { cn } from "@/lib/utils";

/** Selector de opciones grande, cómodo con el dedo en móvil y tablet. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: {
    value: T;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  label: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-lg border border-border bg-surface/60 p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              size === "lg" ? "h-12 text-base" : "h-11 text-sm",
              active
                ? "bg-accent text-on-accent shadow-[0_4px_24px_-4px_var(--color-accent-glow)]"
                : "text-muted hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
