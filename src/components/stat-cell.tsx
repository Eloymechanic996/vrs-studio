import { cn } from "@/lib/utils";

export function StatCell({
  label,
  value,
  accent,
  hint,
  size = "lg",
}: {
  label: string;
  value: string;
  accent?: boolean;
  hint?: string;
  size?: "base" | "lg";
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p
        className={cn(
          "tabular font-semibold",
          size === "lg" ? "text-lg" : "text-base",
          accent ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
