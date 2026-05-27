import Link from "next/link";
import { redirect } from "next/navigation";
import { Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string; notice?: string }>;
}) {
  const { mode, error, notice } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const isSignup = mode === "signup";

  return (
    <div className="grid min-h-full place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-orange-500 text-white shadow-[0_10px_30px_-5px_var(--color-accent-glow)]">
            <Timer className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            VRS <span className="text-accent">Studio</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Control de competicion
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isSignup ? "Crear cuenta" : "Iniciar sesion"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm
              mode={isSignup ? "signup" : "signin"}
              error={error}
              notice={notice}
            />
            <p className="mt-4 text-center text-xs text-muted">
              {isSignup ? (
                <>
                  Ya tienes cuenta?{" "}
                  <Link href="/login" className="text-accent hover:underline">
                    Inicia sesion
                  </Link>
                </>
              ) : (
                <>
                  Aun no tienes cuenta?{" "}
                  <Link
                    href="/login?mode=signup"
                    className="text-accent hover:underline"
                  >
                    Crear una
                  </Link>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
