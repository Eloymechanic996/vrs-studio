"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AUTH_MESSAGES as M, MIN_PASSWORD } from "@/lib/auth-messages";
import { isRecoverySession } from "@/lib/recovery";
import { createClient } from "@/lib/supabase/server";

async function confirmUrl(next: string) {
  const origin = (await headers()).get("origin") ?? "";
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}

function errorMessage(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": M.wrongCredentials,
    "Email not confirmed": M.emailNotConfirmed,
    "User already registered": M.alreadyRegistered,
  };
  if (Object.hasOwn(known, message)) return known[message];
  if (/rate limit/i.test(message)) return M.rateLimited;
  return M.generic;
}

const back = (mode: string, param: "error" | "notice", text: string): never =>
  redirect(`/login?${mode ? `mode=${mode}&` : ""}${param}=${encodeURIComponent(text)}`);

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) back("", "error", M.missingCredentials);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) back("", "error", errorMessage(error.message));

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < MIN_PASSWORD) {
    back("signup", "error", M.signupInvalid);
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await confirmUrl("/") },
  });
  if (error) back("signup", "error", errorMessage(error.message));

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  back("", "notice", M.checkEmail);
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) back("forgot", "error", M.missingEmail);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await confirmUrl("/reset-password"),
  });
  if (error && /rate limit/i.test(error.message)) back("forgot", "error", errorMessage(error.message));

  // Mismo mensaje exista o no la cuenta, para no revelar quién está registrado.
  back("", "notice", M.resetSent);
}

export async function setNewPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const again = (text: string): never =>
    redirect(`/reset-password?error=${encodeURIComponent(text)}`);
  if (password.length < MIN_PASSWORD) again(M.passwordTooShort);
  if (new TextEncoder().encode(password).length > 72) again(M.passwordTooLong);

  const supabase = await createClient();
  // Solo desde el enlace del correo de recuperación; con una sesión normal el
  // cambio se hace en Configuración, pidiendo la contraseña actual.
  if (!(await isRecoverySession(supabase))) {
    redirect(`/login?error=${encodeURIComponent(M.resetExpired)}`);
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) again(M.passwordRejected);
  revalidatePath("/", "layout");
  redirect("/");
}
