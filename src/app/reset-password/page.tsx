import { redirect } from "next/navigation";
import { setNewPassword } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { AUTH_MESSAGES, knownMessage } from "@/lib/auth-messages";
import { isRecoverySession } from "@/lib/recovery";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const error = knownMessage((await searchParams).error);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?error=${encodeURIComponent(AUTH_MESSAGES.resetExpired)}`);
  }
  // Con una sesión normal (no del enlace de recuperación) se cambia en Configuración.
  if (!(await isRecoverySession(supabase))) redirect("/settings");

  return (
    <div className="grid min-h-full place-items-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nueva contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setNewPassword} className="flex flex-col gap-4">
            <Field label="Contraseña" hint="Mínimo 8 caracteres">
              <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
            </Field>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button type="submit" size="lg" className="w-full">
              Guardar y entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
