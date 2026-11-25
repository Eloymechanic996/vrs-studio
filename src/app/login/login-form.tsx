"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import type { SocialLogins } from "@/lib/auth-providers";
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
  social = { google: false, microsoft: false },
}: {
  mode: LoginMode;
  error?: string;
  notice?: string;
  /** Botones de Google y Microsoft: solo los que están configurados en Supabase. */
  social?: SocialLogins;
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

      {mode !== "forgot" && (social.google || social.microsoft) ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
          </div>
          {/* Enlaces normales, no botones del formulario: ver src/lib/oauth-start.ts */}
          {social.google ? (
            <a href="/auth/google" className={SOCIAL_CLASS}>
              <GoogleLogo />
              Continuar con Google
            </a>
          ) : null}
          {social.microsoft ? (
            <a href="/auth/microsoft" className={SOCIAL_CLASS}>
              <MicrosoftLogo />
              Continuar con Microsoft
            </a>
          ) : null}
        </>
      ) : null}
    </form>
  );
}

const SOCIAL_CLASS =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
