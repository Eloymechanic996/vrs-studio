"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    redirect("/login?error=Credenciales+incompletas");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    redirect("/login?mode=signup&error=Credenciales+incompletas");
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(error.message)}`,
    );
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  redirect(
    "/login?notice=" +
      encodeURIComponent("Revisa tu correo para confirmar la cuenta."),
  );
}
