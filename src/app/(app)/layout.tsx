import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { SettingsProvider } from "@/components/settings-provider";
import { ToastProvider } from "@/components/toast";
import { settingsFromRow } from "@/lib/settings";
import { avatarUrl, displayName } from "@/lib/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("display_name, avatar_path").eq("user_id", user.id).maybeSingle(),
  ]);

  const shellUser = {
    name: displayName(profile, user.email),
    avatarUrl: avatarUrl(profile?.avatar_path),
  };

  return (
    <ToastProvider>
      <SettingsProvider initial={settingsFromRow(row)}>
        <AppShell user={shellUser}>{children}</AppShell>
      </SettingsProvider>
    </ToastProvider>
  );
}
