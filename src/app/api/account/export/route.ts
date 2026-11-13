import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Copia completa de los datos del usuario, en JSON. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [sessions, laps, sectors, events, setups, settings, profile] = await Promise.all([
    supabase.from("sessions").select("*").order("date"),
    supabase.from("laps").select("*").order("lap_number"),
    supabase.from("lap_sectors").select("*"),
    supabase.from("events").select("*"),
    supabase.from("setups").select("*"),
    supabase.from("user_settings").select("*").maybeSingle(),
    supabase.from("profiles").select("*").maybeSingle(),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    email: user.email,
    profile: profile.data,
    settings: settings.data,
    sessions: sessions.data ?? [],
    laps: laps.data ?? [],
    lap_sectors: sectors.data ?? [],
    events: events.data ?? [],
    setups: setups.data ?? [],
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vrs-studio-datos.json"',
      "Cache-Control": "no-store",
    },
  });
}
