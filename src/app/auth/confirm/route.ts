import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
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

  const supabase = await createClient();
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return toNext();
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return toNext();
    if (isEmailChange) {
      destination.pathname = "/login";
      destination.searchParams.set("notice", "Correo confirmado. Inicia sesión para continuar.");
      return NextResponse.redirect(destination);
    }
    // El enlace se abrió en otro navegador: el correo ya está confirmado, pero no hay sesión.
    if (next !== "/reset-password") {
      destination.pathname = "/login";
      destination.searchParams.set("notice", "Cuenta confirmada. Ya puedes iniciar sesión.");
      return NextResponse.redirect(destination);
    }
    destination.pathname = "/login";
    destination.searchParams.set("error", "Abre el enlace en el mismo navegador donde lo solicitaste.");
    return NextResponse.redirect(destination);
  }

  destination.pathname = "/login";
  destination.searchParams.set("error", "El enlace no es válido o ha caducado. Solicita uno nuevo.");
  return NextResponse.redirect(destination);
}
