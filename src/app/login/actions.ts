"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD = 8;

async function confirmUrl(next: string) {
  const origin = (await headers()).get("origin") ?? "";
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}

function errorMessage(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Correo o contraseña incorrectos.",
    "Email not confirmed": "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.",
    "User already registered": "Ya existe una cuenta con ese correo.",
  };
  if (known[message]) return known[message];
  if (/rate limit/i.test(message)) return "Demasiados intentos. Espera unos minutos.";
  return "No se ha podido completar la operación.";
}

const back = (mode: string, param: "error" | "notice", text: string): never =>
  redirect(`/login?${mode ? `mode=${mode}&` : ""}${param}=${encodeURIComponent(text)}`);

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) back("", "error", "Faltan el correo o la contraseña.");

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
    back("signup", "error", `Indica un correo y una contraseña de al menos ${MIN_PASSWORD} caracteres.`);
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

  back("", "notice", "Revisa tu correo para confirmar la cuenta.");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) back("forgot", "error", "Indica tu correo.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await confirmUrl("/reset-password"),
  });
  if (error && /rate limit/i.test(error.message)) back("forgot", "error", errorMessage(error.message));

  // Mismo mensaje exista o no la cuenta, para no revelar quién está registrado.
  back("", "notice", "Si ese correo tiene cuenta, recibirás un enlace para cambiar la contraseña.");
}

export async function setNewPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) {
    redirect(`/reset-password?error=${encodeURIComponent(`Usa al menos ${MIN_PASSWORD} caracteres.`)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent("No se pudo cambiar. Prueba con otra contraseña.")}`);
  }
  revalidatePath("/", "layout");
  redirect("/");
}
