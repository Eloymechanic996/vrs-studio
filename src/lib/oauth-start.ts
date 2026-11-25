import { NextResponse, type NextRequest } from "next/server";
import { AUTH_MESSAGES as M } from "@/lib/auth-messages";
import { createClient } from "@/lib/supabase/server";

export type SocialProvider = "google" | "microsoft";

/**
 * Manda a la pantalla de Google o Microsoft. Al volver, /auth/confirm abre la
 * sesión; `via` le dice de dónde viene para explicar bien un posible error.
 *
 * Se usa desde un enlace normal y no desde un formulario: la CSP
 * (form-action 'self') no deja que un formulario redirija a otro dominio.
 */
export async function startOAuth(request: NextRequest, provider: SocialProvider) {
  const back = request.nextUrl.clone();
  back.pathname = "/auth/confirm";
  back.search = "";
  back.searchParams.set("next", "/");
  back.searchParams.set("via", provider);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider === "microsoft" ? "azure" : "google",
    options: {
      redirectTo: back.toString(),
      // Microsoft solo devuelve el correo si se pide expresamente.
      scopes: provider === "microsoft" ? "email" : undefined,
    },
  });

  if (error || !data.url) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("error", provider === "microsoft" ? M.microsoftFailed : M.googleFailed);
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(data.url);
}
