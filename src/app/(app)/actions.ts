"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET } from "@/lib/profile";
import { MODALITIES, SESSION_TYPES, TRACK_STATES, WEATHERS } from "@/lib/labels";
import type { UserSettings } from "@/lib/settings";
import type { Json } from "@/lib/supabase/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });
const OK: ActionResult = { ok: true };

const id = z.string().uuid();
const optionalText = z.string().trim().max(300).optional();
const lapMs = z.number().int().min(1).max(24 * 3600 * 1000);

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const sessionSchema = z.object({
  name: z.string().trim().min(1, "Pon un nombre a la sesión.").max(120),
  modality: z.enum(MODALITIES as [string, ...string[]]),
  session_type: z.enum(SESSION_TYPES as [string, ...string[]]),
  category: optionalText,
  championship: optionalText,
  team: optionalText,
  event: optionalText,
  circuit: optionalText,
  driver: optionalText,
  chassis: optionalText,
  engine: optionalText,
  weather: z.string().optional(),
  air_temp: z.string().optional(),
  track_temp: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida."),
  notes: z.string().trim().max(4000).optional(),
  sectors_count: z.string().optional(),
});

export type SessionFormInput = z.input<typeof sessionSchema>;

function numberOrNull(value: string | undefined) {
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toSessionRow(input: z.output<typeof sessionSchema>) {
  return {
    name: input.name,
    modality: input.modality as (typeof MODALITIES)[number],
    session_type: input.session_type as (typeof SESSION_TYPES)[number],
    category: input.category || null,
    championship: input.championship || null,
    team: input.team || null,
    event: input.event || null,
    circuit: input.circuit || null,
    driver: input.driver || null,
    chassis: input.chassis || null,
    engine: input.engine || null,
    weather: WEATHERS.find((w) => w === input.weather) ?? null,
    air_temp: numberOrNull(input.air_temp),
    track_temp: numberOrNull(input.track_temp),
    date: input.date,
    notes: input.notes || null,
    sectors_count: Math.min(10, Math.max(0, Math.trunc(Number(input.sectors_count) || 0))),
  };
}

export async function createSession(raw: SessionFormInput): Promise<ActionResult> {
  const parsed = sessionSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("sessions")
    .insert({ ...toSessionRow(parsed.data), user_id: user.id })
    .select("id")
    .single();
  if (error) return fail("No se pudo crear la sesión.");

  await supabase.from("setups").upsert({ session_id: data.id }, { onConflict: "session_id" });

  revalidatePath("/");
  redirect(`/sessions/${data.id}`);
}

export async function updateSession(sessionId: string, raw: SessionFormInput): Promise<ActionResult> {
  const parsed = sessionSchema.safeParse(raw);
  if (!id.safeParse(sessionId).success || !parsed.success) {
    return fail(parsed.success ? "Sesión no válida." : parsed.error.issues[0].message);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .update(toSessionRow(parsed.data))
    .eq("id", sessionId)
    .select("id");
  if (error || !data?.length) return fail("No se pudo guardar la sesión.");

  revalidatePath("/");
  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}`);
}

/** Crea una sesión nueva con los mismos datos y setup, sin vueltas ni eventos. */
export async function duplicateSession(sessionId: string): Promise<ActionResult> {
  if (!id.safeParse(sessionId).success) return fail("Sesión no válida.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: source }, { data: setup }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
    supabase.from("setups").select("*").eq("session_id", sessionId).maybeSingle(),
  ]);
  if (!source) return fail("Sesión no encontrada.");

  const { data: created, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      name: `${source.name} (copia)`.slice(0, 120),
      modality: source.modality,
      session_type: source.session_type,
      category: source.category,
      championship: source.championship,
      team: source.team,
      event: source.event,
      circuit: source.circuit,
      driver: source.driver,
      chassis: source.chassis,
      engine: source.engine,
      weather: source.weather,
      air_temp: source.air_temp,
      track_temp: source.track_temp,
      sectors_count: source.sectors_count,
      notes: source.notes,
    })
    .select("id")
    .single();
  if (error) return fail("No se pudo duplicar la sesión.");

  await supabase.from("setups").upsert(
    {
      session_id: created.id,
      steering: setup?.steering ?? {},
      rear_axle: setup?.rear_axle ?? {},
      engine: setup?.engine ?? {},
    },
    { onConflict: "session_id" },
  );

  revalidatePath("/");
  redirect(`/sessions/${created.id}`);
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  if (!id.safeParse(sessionId).success) return fail("Sesión no válida.");
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return fail("No se pudo borrar la sesión.");
  revalidatePath("/");
  redirect("/");
}

const updateLapSchema = z.object({
  session_id: id,
  lap_id: id,
  lap_time_ms: lapMs,
  track_state: z.enum(TRACK_STATES as [string, ...string[]]),
  notes: z.string().trim().max(500).nullable().optional(),
  sectors: z.array(lapMs).max(10).nullable().optional(),
});

export async function updateLap(raw: z.input<typeof updateLapSchema>): Promise<ActionResult> {
  const parsed = updateLapSchema.safeParse(raw);
  if (!parsed.success) return fail("Datos de vuelta no válidos.");
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_lap", {
    p_lap_id: input.lap_id,
    p_lap_time_ms: input.lap_time_ms,
    p_track_state: input.track_state as (typeof TRACK_STATES)[number],
    p_notes: input.notes ?? undefined,
    p_sectors: input.sectors ?? undefined,
  });
  if (error) return fail("No se pudo guardar la vuelta.");
  revalidatePath(`/sessions/${input.session_id}`);
  return OK;
}

export async function deleteLap(sessionId: string, lapId: string): Promise<ActionResult> {
  if (!id.safeParse(lapId).success) return fail("Vuelta no válida.");
  const supabase = await createClient();
  const { error } = await supabase.from("laps").delete().eq("id", lapId);
  if (error) return fail("No se pudo borrar la vuelta.");
  revalidatePath(`/sessions/${sessionId}`);
  return OK;
}

export async function deleteEvent(sessionId: string, eventId: string): Promise<ActionResult> {
  if (!id.safeParse(eventId).success) return fail("Evento no válido.");
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return fail("No se pudo borrar el evento.");
  revalidatePath(`/sessions/${sessionId}`);
  return OK;
}

export async function toggleSessionPublic(input: {
  session_id: string;
  make_public: boolean;
}): Promise<ActionResult> {
  if (!id.safeParse(input.session_id).success) return fail("Sesión no válida.");
  const supabase = await createClient();
  let update: { is_public: boolean; public_slug?: string } = { is_public: false };

  if (input.make_public) {
    const { data: existing } = await supabase
      .from("sessions")
      .select("public_slug")
      .eq("id", input.session_id)
      .maybeSingle();
    let slug = existing?.public_slug ?? null;
    if (!slug) {
      const { data, error } = await supabase.rpc("generate_session_slug");
      if (error || !data) return fail("No se pudo crear el enlace.");
      slug = data;
    }
    update = { is_public: true, public_slug: slug };
  }

  const { error } = await supabase.from("sessions").update(update).eq("id", input.session_id);
  if (error) return fail("No se pudo cambiar la visibilidad.");
  revalidatePath(`/sessions/${input.session_id}`);
  return OK;
}

const setupValues = z.record(z.string(), z.string().max(200));

export async function saveSetup(input: {
  session_id: string;
  steering: Record<string, string>;
  rear_axle: Record<string, string>;
  engine: Record<string, string>;
}): Promise<ActionResult> {
  const parsed = z
    .object({ session_id: id, steering: setupValues, rear_axle: setupValues, engine: setupValues })
    .safeParse(input);
  if (!parsed.success) return fail("Datos de setup no válidos.");

  const supabase = await createClient();
  const { error } = await supabase.from("setups").upsert(
    {
      session_id: parsed.data.session_id,
      steering: parsed.data.steering as Json,
      rear_axle: parsed.data.rear_axle as Json,
      engine: parsed.data.engine as Json,
    },
    { onConflict: "session_id" },
  );
  if (error) return fail("No se pudo guardar el setup.");
  return OK;
}

export async function loadSetupFrom(sessionId: string): Promise<
  | { ok: true; steering: Record<string, string>; rear_axle: Record<string, string>; engine: Record<string, string> }
  | { ok: false; error: string }
> {
  if (!id.safeParse(sessionId).success) return { ok: false, error: "Sesión no válida." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("setups")
    .select("steering, rear_axle, engine")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Esa sesión no tiene setup." };
  return {
    ok: true,
    steering: (data.steering ?? {}) as Record<string, string>,
    rear_axle: (data.rear_axle ?? {}) as Record<string, string>,
    engine: (data.engine ?? {}) as Record<string, string>,
  };
}

// ---------------------------------------------------------------------------
// Configuración y cuenta
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  appearance: z.enum(["racing", "lofi", "aviation", "military", "mechanic"]),
  theme: z.enum(["dark", "light", "auto", "sun"]),
  minLapSeconds: z.number().min(0).max(600),
  vibrate: z.boolean(),
  keepAwake: z.boolean(),
  defaultModality: z.enum(MODALITIES as [string, ...string[]]),
  defaultSessionType: z.enum(SESSION_TYPES as [string, ...string[]]),
  defaultSectors: z.number().int().min(0).max(10),
  defaultTeam: z.string().trim().max(120),
  defaultDriver: z.string().trim().max(120),
  defaultChassis: z.string().trim().max(120),
  defaultEngine: z.string().trim().max(120),
  defaultCircuit: z.string().trim().max(120),
});

export async function saveSettings(raw: UserSettings): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return fail("Algún ajuste no es válido.");
  const s = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Tu sesión ha caducado.");

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      appearance: s.appearance,
      theme: s.theme,
      min_lap_seconds: s.minLapSeconds,
      vibrate: s.vibrate,
      keep_awake: s.keepAwake,
      default_modality: s.defaultModality as (typeof MODALITIES)[number],
      default_session_type: s.defaultSessionType as (typeof SESSION_TYPES)[number],
      default_sectors: s.defaultSectors,
      default_team: s.defaultTeam || null,
      default_driver: s.defaultDriver || null,
      default_chassis: s.defaultChassis || null,
      default_engine: s.defaultEngine || null,
      default_circuit: s.defaultCircuit || null,
    },
    { onConflict: "user_id" },
  );
  if (error) return fail("No se pudieron guardar los ajustes.");
  return OK;
}

export async function changePassword(password: string): Promise<ActionResult> {
  if (password.length < 8) return fail("La contraseña debe tener al menos 8 caracteres.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail("No se pudo cambiar la contraseña. Prueba con otra diferente.");
  return OK;
}

const profileSchema = z.object({
  display_name: z.string().trim().max(80, "El nombre admite 80 caracteres."),
  team: z.string().trim().max(120, "El equipo admite 120 caracteres."),
  car_number: z.string().trim().max(10, "El dorsal admite 10 caracteres."),
  category: z.string().trim().max(120, "La categoría admite 120 caracteres."),
  country: z.string().trim().max(80, "El país admite 80 caracteres."),
  bio: z.string().trim().max(1000, "La presentación admite 1000 caracteres."),
});

export type ProfileInput = z.input<typeof profileSchema>;

export async function updateProfile(raw: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const p = parsed.data;
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: p.display_name || null,
      team: p.team || null,
      car_number: p.car_number || null,
      category: p.category || null,
      country: p.country || null,
      bio: p.bio || null,
    },
    { onConflict: "user_id" },
  );
  if (error) return fail("No se pudo guardar el perfil.");

  revalidatePath("/", "layout");
  return OK;
}

/** Lista y borra los archivos de la carpeta del usuario en el bucket de fotos, salvo `keep`. */
async function removeAvatarFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keep?: string,
) {
  const { data } = await supabase.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 });
  const paths = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (paths.length) await supabase.storage.from(AVATAR_BUCKET).remove(paths);
}

/** Guarda la foto ya subida desde el navegador y borra las anteriores. Con null, quita la foto. */
export async function setAvatar(path: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (path !== null && !new RegExp(`^${user.id}/[\\w.-]{1,100}$`).test(path)) {
    return fail("Foto no válida.");
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, avatar_path: path }, { onConflict: "user_id" });
  if (error) return fail("No se pudo guardar la foto.");

  await removeAvatarFiles(supabase, user.id, path ?? undefined).catch(() => {});
  revalidatePath("/", "layout");
  return OK;
}

export async function changeEmail(rawEmail: string): Promise<ActionResult> {
  const parsed = z.string().trim().toLowerCase().email().max(254).safeParse(rawEmail);
  if (!parsed.success) return fail("Escribe un correo válido.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (parsed.data === user.email?.toLowerCase()) return fail("Ese ya es tu correo actual.");

  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/settings")}` },
  );
  if (error) {
    if (/rate limit/i.test(error.message)) return fail("Demasiados intentos. Espera unos minutos.");
    if (/already|registered|exists/i.test(error.message)) return fail("Ese correo ya tiene una cuenta.");
    return fail("No se pudo cambiar el correo.");
  }
  return OK;
}

export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  if (confirmation !== "BORRAR") return fail("Escribe BORRAR para confirmar.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Las fotos viven en Storage, que no se borra en cascada con la cuenta.
  if (user) await removeAvatarFiles(supabase, user.id).catch(() => {});
  const { error } = await supabase.rpc("delete_own_account");
  if (error) return fail("No se pudo borrar la cuenta.");
  await supabase.auth.signOut().catch(() => {});
  redirect(`/login?notice=${encodeURIComponent("Tu cuenta y todos tus datos se han borrado.")}`);
}
