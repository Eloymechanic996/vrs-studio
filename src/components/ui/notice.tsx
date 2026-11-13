import { cn } from "@/lib/utils";

export function Notice({
  tone,
  children,
  className,
}: {
  tone: "error" | "info" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-xs",
        tone === "error" && "border-danger/40 bg-danger/10 text-danger",
        tone === "info" && "border-info/40 bg-info/10 text-info",
        tone === "success" && "border-success/40 bg-success/10 text-success",
        className,
      )}
    >
      {children}
    </p>
  );
}
