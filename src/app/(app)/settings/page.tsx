import { createClient } from "@/lib/supabase/server";
import { SettingsPanel } from "./settings-panel";

export const metadata = { title: "Configuración" };

const NOTICES: Record<string, string> = {
  "email-updated": "Correo confirmado. Si arriba aún ves el anterior, abre también el enlace enviado al otro correo.",
  "email-pending": "Enlace aceptado. Abre ahora el enlace que te llegó al otro correo para terminar el cambio.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const { notice: rawNotice } = await searchParams;
  const key = Array.isArray(rawNotice) ? rawNotice[0] : rawNotice;
  // Solo los avisos propios: ?notice=constructor no debe colarse desde Object.
  const notice = key && Object.hasOwn(NOTICES, key) ? NOTICES[key] : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Quien solo entra con Google o Microsoft no tiene contraseña en VRS Studio.
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  const hasPassword =
    providers.includes("email") || (user?.identities ?? []).some((i) => i.provider === "email");
  const socialName = providers.includes("google") ? "Google" : "Microsoft";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted">
          Tus preferencias se guardan en tu cuenta y te siguen a cualquier dispositivo.
        </p>
      </div>
      <SettingsPanel
        email={user?.email ?? ""}
        notice={notice}
        hasPassword={hasPassword}
        socialName={socialName}
      />
    </div>
  );
}
