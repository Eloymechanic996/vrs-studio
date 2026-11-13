import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("sessions").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted">Tu ficha de piloto. Solo la ves tú.</p>
      </div>
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        memberSince={user.created_at}
        sessionsCount={count ?? 0}
        profile={profile}
      />
    </div>
  );
}
