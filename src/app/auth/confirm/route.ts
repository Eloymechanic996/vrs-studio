import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_MESSAGES as M } from "@/lib/auth-messages";
import { createClient } from "@/lib/supabase/server";

/** Destino de los enlaces de los correos de confirmación y de contraseña. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/";
  // Solo rutas internas: evita redirigir a sitios externos.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const code = searchParams.get("code");
  const destination = request.nextUrl.clone();
  destination.search = "";

  const isEmailChange = next === "/settings";
  const toNext = () => {
    destination.pathname = next;
    if (isEmailChange) destination.searchParams.set("notice", "email-updated");
    return NextResponse.redirect(destination);
  };

  // Cambio de correo con doble confirmación: el primer enlace solo trae un mensaje.
  if (isEmailChange && !code && !tokenHash && searchParams.get("message")) {
    destination.pathname = next;
    destination.searchParams.set("notice", "email-pending");
    return NextResponse.redirect(destination);
  }

  // Vuelta de Google o Microsoft con error: cancelado, bloqueado por el centro u otro fallo.
  const oauthError = searchParams.get("error");
  if (oauthError && !code && !tokenHash) {
    const detail = `${searchParams.get("error_code") ?? ""} ${searchParams.get("error_description") ?? ""}`;
    const google = searchParams.get("via") === "google";
    const cancelled = oauthError === "access_denied";
    destination.pathname = "/login";
    destination.searchParams.set(
      "error",
      google
        ? cancelled
          ? M.googleCancelled
          : M.googleFailed
        : /consent|AADSTS65001|AADSTS90094|admin|approval/i.test(detail)
          ? M.microsoftBlocked
          : cancelled
            ? M.microsoftCancelled
            : M.microsoftFailed,
    );
    return NextResponse.redirect(destination);
  }

  const supabase = await createClient();
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return toNext();
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return toNext();
    if (isEmailChange) {
      destination.pathname = "/login";
      destination.searchParams.set("notice", M.emailConfirmedLogin);
      return NextResponse.redirect(destination);
    }
    // El enlace se abrió en otro navegador: el correo ya está confirmado, pero no hay sesión.
    if (next !== "/reset-password") {
      destination.pathname = "/login";
      destination.searchParams.set("notice", M.accountConfirmed);
      return NextResponse.redirect(destination);
    }
    destination.pathname = "/login";
    destination.searchParams.set("error", M.sameBrowser);
    return NextResponse.redirect(destination);
  }

  destination.pathname = "/login";
  destination.searchParams.set("error", M.invalidLink);
  return NextResponse.redirect(destination);
}
