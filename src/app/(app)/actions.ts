"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  Json,
  Modality,
  SessionType,
  Weather,
} from "@/lib/supabase/types";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type CreateSessionInput = {
  name: string;
  modality: Modality;
  session_type: SessionType;
  category?: string;
  championship?: string;
  team?: string;
  event?: string;
  circuit?: string;
  driver?: string;
  chassis?: string;
  engine?: string;
  weather?: Weather | "";
  air_temp?: string;
  track_temp?: string;
  date: string;
  notes?: string;
  sectors_count?: string;
};

export async function createSession(input: CreateSessionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      name: input.name,
      modality: input.modality,
      session_type: input.session_type,
      category: input.category || null,
      championship: input.championship || null,
      team: input.team || null,
      event: input.event || null,
      circuit: input.circuit || null,
      driver: input.driver || null,
      chassis: input.chassis || null,
      engine: input.engine || null,
      weather: input.weather ? (input.weather as Weather) : null,
      air_temp: input.air_temp ? Number(input.air_temp) : null,
      track_temp: input.track_temp ? Number(input.track_temp) : null,
      date: input.date,
      notes: input.notes || null,
      sectors_count: input.sectors_count
        ? Math.min(10, Math.max(0, Number(input.sectors_count) || 0))
        : 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from("setups")
    .insert({ session_id: data.id })
    .select("id")
    .single();

  revalidatePath("/");
  redirect(`/sessions/${data.id}`);
}

export async function deleteSession(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

export async function recordLap(input: {
  session_id: string;
  lap_number: number;
  lap_time_ms: number;
  total_time_ms: number;
  track_state?: string;
  notes?: string;
  sectors?: number[];
}) {
  const supabase = await createClient();
  const { data: lap, error } = await supabase
    .from("laps")
    .insert({
      session_id: input.session_id,
      lap_number: input.lap_number,
      lap_time_ms: input.lap_time_ms,
      total_time_ms: input.total_time_ms,
      track_state: (input.track_state ?? "Green Flag") as never,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (input.sectors && input.sectors.length > 0 && lap) {
    const rows = input.sectors.map((time_ms, i) => ({
      lap_id: lap.id,
      sector_number: i + 1,
      time_ms,
    }));
    await supabase.from("lap_sectors").insert(rows);
  }

  revalidatePath(`/sessions/${input.session_id}`);
}

export async function updateLap(input: {
  session_id: string;
  lap_id: string;
  lap_time_ms: number;
  track_state: string;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("laps")
    .update({
      lap_time_ms: input.lap_time_ms,
      track_state: input.track_state as never,
      notes: input.notes ?? null,
    })
    .eq("id", input.lap_id);
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${input.session_id}`);
}

export async function toggleSessionPublic(input: {
  session_id: string;
  make_public: boolean;
}) {
  const supabase = await createClient();
  if (input.make_public) {
    // Reuse existing slug if any; otherwise generate via DB function.
    const { data: existing } = await supabase
      .from("sessions")
      .select("public_slug")
      .eq("id", input.session_id)
      .maybeSingle();
    let slug = existing?.public_slug ?? null;
    if (!slug) {
      const { data: slugData, error: slugErr } = await supabase.rpc(
        "generate_session_slug",
      );
      if (slugErr) throw new Error(slugErr.message);
      slug = slugData as unknown as string;
    }
    const { error } = await supabase
      .from("sessions")
      .update({ is_public: true, public_slug: slug })
      .eq("id", input.session_id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("sessions")
      .update({ is_public: false })
      .eq("id", input.session_id);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/sessions/${input.session_id}`);
}

export async function recordEvent(input: {
  session_id: string;
  event_type: string;
  lap_number?: number | null;
  elapsed_ms: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    session_id: input.session_id,
    event_type: input.event_type as never,
    lap_number: input.lap_number ?? null,
    elapsed_ms: input.elapsed_ms,
    notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${input.session_id}`);
}

export async function saveSetup(input: {
  session_id: string;
  steering: Json;
  rear_axle: Json;
  engine: Json;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("setups")
    .update({
      steering: input.steering,
      rear_axle: input.rear_axle,
      engine: input.engine,
    })
    .eq("session_id", input.session_id);
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${input.session_id}`);
}

export async function deleteLap(sessionId: string, lapId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("laps").delete().eq("id", lapId);
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${sessionId}`);
}

export async function deleteEvent(sessionId: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/sessions/${sessionId}`);
}
