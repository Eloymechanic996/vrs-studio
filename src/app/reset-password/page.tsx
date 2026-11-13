import { redirect } from "next/navigation";
import { setNewPassword } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?error=${encodeURIComponent("El enlace ha caducado. Solicita uno nuevo.")}`);
  }

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
