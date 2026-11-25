import Link from "next/link";
import { redirect } from "next/navigation";
import { Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AUTH_MESSAGES, knownMessage } from "@/lib/auth-messages";
import { getSocialLogins } from "@/lib/auth-providers";
import { ForgetDevice } from "./forget-device";
import { LoginForm, type LoginMode } from "./login-form";

const TITLES: Record<LoginMode, string> = {
  signin: "Iniciar sesión",
  signup: "Crear cuenta",
  forgot: "Recuperar contraseña",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string | string[]; notice?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  // Solo avisos propios: un texto inventado en el enlace no se muestra.
  const error = knownMessage(params.error);
  const notice = knownMessage(params.notice);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const social = await getSocialLogins();
  const mode: LoginMode = rawMode === "signup" || rawMode === "forgot" ? rawMode : "signin";
  const link = "text-accent hover:underline";

  return (
    <div className="grid min-h-full place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-on-accent">
            <Timer className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            VRS <span className="text-accent">Studio</span>
          </h1>
          <p className="mt-1 text-sm text-muted">Control de competición</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{TITLES[mode]}</CardTitle>
          </CardHeader>
          <CardContent>
            <ForgetDevice accountDeleted={notice === AUTH_MESSAGES.accountDeleted} />
            <LoginForm mode={mode} error={error} notice={notice} social={social} />
            <div className="mt-4 space-y-1 text-center text-xs text-muted">
              {mode === "signin" ? (
                <>
                  <p>
                    <Link href="/login?mode=forgot" className={link}>
                      He olvidado mi contraseña
                    </Link>
                  </p>
                  <p>
                    ¿Aún no tienes cuenta?{" "}
                    <Link href="/login?mode=signup" className={link}>
                      Crear una
                    </Link>
                  </p>
                </>
              ) : (
                <p>
                  <Link href="/login" className={link}>
                    Volver a iniciar sesión
                  </Link>
                </p>
              )}
              <p>
                <Link href="/privacidad" className="hover:text-foreground">
                  Política de privacidad
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
