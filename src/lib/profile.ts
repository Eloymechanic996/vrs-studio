import type { Profile } from "@/lib/supabase/types";

export const AVATAR_BUCKET = "avatars";

/** URL pública de la foto de perfil, o null si no hay. */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

/** Nombre que se muestra: el del perfil o, si no hay, la parte del correo antes de la @. */
export function displayName(profile: Pick<Profile, "display_name"> | null, email?: string | null) {
  return profile?.display_name?.trim() || email?.split("@")[0] || "Piloto";
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
