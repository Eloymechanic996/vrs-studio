"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signInWithPassword, signUpWithPassword } from "./actions";

function SubmitButton({ mode }: { mode: "signin" | "signup" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending
        ? "Cargando..."
        : mode === "signup"
          ? "Crear cuenta"
          : "Entrar"}
    </Button>
  );
}

export function LoginForm({
  mode,
  error,
  notice,
}: {
  mode: "signin" | "signup";
  error?: string;
  notice?: string;
}) {
  const action = mode === "signup" ? signUpWithPassword : signInWithPassword;

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Correo">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
        />
      </Field>
      <Field label="Contrasena" hint={mode === "signup" ? "Minimo 6 caracteres" : undefined}>
        <Input
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={6}
        />
      </Field>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
          {notice}
        </p>
      ) : null}

      <SubmitButton mode={mode} />
    </form>
  );
}
