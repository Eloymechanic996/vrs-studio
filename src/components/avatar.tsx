import { initials } from "@/lib/profile";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  lg: "h-20 w-20 text-2xl",
};

/** Foto de perfil redonda; sin foto, muestra las iniciales. */
export function Avatar({
  src,
  name,
  size = "sm",
  className,
}: {
  src: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-gradient-to-br from-accent/30 to-accent-2/30 font-bold text-foreground",
        SIZES[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen pequeña de Supabase Storage
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
