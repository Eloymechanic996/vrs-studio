"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { requestPasswordReset, signInWithPassword, signUpWithPassword } from "./actions";

export type LoginMode = "signin" | "signup" | "forgot";

const SUBMIT_LABEL: Record<LoginMode, string> = {
  signin: "Entrar",
  signup: "Crear cuenta",
  forgot: "Enviar enlace",
};

const ACTION: Record<LoginMode, (formData: FormData) => Promise<void>> = {
  signin: signInWithPassword,
  signup: signUpWithPassword,
  forgot: requestPasswordReset,
};

function SubmitButton({ mode }: { mode: LoginMode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Cargando..." : SUBMIT_LABEL[mode]}
    </Button>
  );
}

export function LoginForm({
  mode,
  error,
  notice,
}: {
  mode: LoginMode;
  error?: string;
  notice?: string;
}) {
  return (
    <form action={ACTION[mode]} className="flex flex-col gap-4">
      <Field label="Correo">
        <Input name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
      </Field>
      {mode !== "forgot" ? (
        <Field label="Contraseña" hint={mode === "signup" ? "Mínimo 8 caracteres" : undefined}>
          <Input
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
          />
        </Field>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice ? <Notice tone="info">{notice}</Notice> : null}

      <SubmitButton mode={mode} />
    </form>
  );
}
