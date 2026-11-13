import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_TYPE_LABELS,
  SESSION_TYPE_LABELS,
  TRACK_STATE_LABELS,
  WEATHER_LABELS,
} from "@/lib/labels";
import {
  bestSectorTimes,
  computeLapStats,
  computeStints,
  consistencyLabel,
  theoreticalBestLap,
  totalPitTimeMs,
} from "@/lib/stats";
import type { Lap, LapEvent, LapSector, Session, Setup } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEMPLATE_BYTES = 5 * 1024 * 1024;
const SHEET_NAMES = ["Resumen", "Tiempos", "Sectores", "Stints", "Eventos", "Setup"];

/** Excel guarda los tiempos como fracción de día; así se pueden sumar y graficar. */
const TIME_FORMAT = "[mm]:ss.000";
const DELTA_FORMAT = "+0.000;-0.000;0.000";
const toExcelTime = (ms: number) => ms / 86_400_000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return buildResponse(id, null);
}

/** Igual que GET, pero rellenando una plantilla .xlsx del usuario. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("template");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta la plantilla." }, { status: 400 });
  }
  if (file.size > MAX_TEMPLATE_BYTES) {
    return NextResponse.json({ error: "La plantilla supera los 5 MB." }, { status: 413 });
  }
  return buildResponse(id, await file.arrayBuffer());
}

async function buildResponse(id: string, template: ArrayBuffer | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  if (!session) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const [{ data: laps }, { data: events }, { data: setup }] = await Promise.all([
    supabase.from("laps").select("*").eq("session_id", id).order("lap_number", { ascending: true }),
    supabase.from("events").select("*").eq("session_id", id).order("elapsed_ms", { ascending: true }),
    supabase.from("setups").select("*").eq("session_id", id).maybeSingle(),
  ]);

  const lapList = laps ?? [];
  const eventList = events ?? [];
  const lapIds = lapList.map((l) => l.id);
  const { data: sectorsData } =
    lapIds.length > 0
      ? await supabase.from("lap_sectors").select("*").in("lap_id", lapIds)
      : { data: [] as LapSector[] };
  const sectorsList = sectorsData ?? [];

  const wb = new ExcelJS.Workbook();
  if (template) {
    try {
      await wb.xlsx.load(template);
    } catch {
      return NextResponse.json({ error: "El archivo no es un .xlsx válido." }, { status: 400 });
    }
    for (const name of SHEET_NAMES) {
      const existing = wb.getWorksheet(name);
      if (existing) wb.removeWorksheet(existing.id);
    }
  }
  wb.creator = "VRS Studio";
  wb.created = new Date();

  buildSummarySheet(wb, session, lapList, eventList);
  buildLapsSheet(wb, lapList, sectorsList, session.sectors_count);
  if (session.sectors_count > 0) buildSectorsSheet(wb, sectorsList, session.sectors_count);
  buildStintsSheet(wb, lapList, eventList);
  buildEventsSheet(wb, eventList);
  buildSetupSheet(wb, setup);

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `${slug(session.name) || "sesion"}-${session.date}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function buildSummarySheet(wb: ExcelJS.Workbook, session: Session, laps: Lap[], events: LapEvent[]) {
  const sheet = wb.addWorksheet("Resumen");
  sheet.columns = [
    { header: "Campo", key: "k", width: 26 },
    { header: "Valor", key: "v", width: 44 },
  ];

  const rows: [string, unknown][] = [
    ["Nombre", session.name],
    ["Modalidad", session.modality],
    ["Tipo de sesión", SESSION_TYPE_LABELS[session.session_type]],
    ["Categoría", session.category],
    ["Campeonato", session.championship],
    ["Equipo", session.team],
    ["Evento", session.event],
    ["Circuito", session.circuit],
    ["Fecha", session.date],
    ["Piloto", session.driver],
    ["Chasis", session.chassis],
    ["Motor", session.engine],
    ["Clima", session.weather ? WEATHER_LABELS[session.weather] : null],
    ["Temp. aire (°C)", session.air_temp],
    ["Temp. pista (°C)", session.track_temp],
    ["Notas", session.notes],
  ];
  for (const [k, v] of rows) sheet.addRow({ k, v: v ?? "" });

  const stats = computeLapStats(laps);
  sheet.addRow({});
  sheet.addRow({ k: "Estadísticas de ritmo", v: "" }).font = { bold: true };
  sheet.addRow({ k: "Vueltas totales", v: stats.count });
  sheet.addRow({ k: "Vueltas limpias", v: stats.cleanCount });

  const addTime = (k: string, ms: number | null) => {
    const row = sheet.addRow({ k, v: ms !== null ? toExcelTime(ms) : "—" });
    if (ms !== null) row.getCell("v").numFmt = TIME_FORMAT;
    row.getCell("v").alignment = { horizontal: "left" };
  };
  addTime("Mejor vuelta", stats.bestMs);
  addTime("Media (vueltas limpias)", stats.averageMs);

  const deviation = sheet.addRow({
    k: "Desviación típica (s)",
    v: stats.stddevMs !== null ? stats.stddevMs / 1000 : "—",
  });
  deviation.getCell("v").numFmt = "0.000";
  deviation.getCell("v").alignment = { horizontal: "left" };

  const variation = sheet.addRow({ k: "Coef. de variación", v: stats.cv ?? "—" });
  variation.getCell("v").numFmt = "0.00%";
  variation.getCell("v").alignment = { horizontal: "left" };

  sheet.addRow({ k: "Consistencia", v: consistencyLabel(stats.cv).label });

  const pitTotal = totalPitTimeMs(events);
  if (pitTotal > 0) addTime("Tiempo total en boxes", pitTotal);

  styleHeader(sheet);
}

function buildLapsSheet(wb: ExcelJS.Workbook, laps: Lap[], sectors: LapSector[], sectorsCount: number) {
  const sheet = wb.addWorksheet("Tiempos");
  const columns: { header: string; key: string; width: number }[] = [
    { header: "Vuelta", key: "n", width: 10 },
    { header: "Tiempo", key: "lap", width: 14 },
    { header: "Delta mejor (s)", key: "delta", width: 16 },
    { header: "Acumulado", key: "tot", width: 14 },
  ];
  for (let i = 1; i <= sectorsCount; i++) columns.push({ header: `S${i}`, key: `s${i}`, width: 12 });
  columns.push(
    { header: "Estado de pista", key: "state", width: 22 },
    { header: "Notas", key: "notes", width: 40 },
  );
  sheet.columns = columns;

  const stats = computeLapStats(laps);
  const sectorMap = new Map<string, Map<number, number>>();
  for (const s of sectors) {
    const m = sectorMap.get(s.lap_id) ?? new Map<number, number>();
    m.set(s.sector_number, s.time_ms);
    sectorMap.set(s.lap_id, m);
  }

  for (const l of laps) {
    const values: Record<string, unknown> = {
      n: l.lap_number,
      lap: toExcelTime(l.lap_time_ms),
      delta: stats.bestMs !== null ? (l.lap_time_ms - stats.bestMs) / 1000 : "",
      tot: toExcelTime(l.total_time_ms),
      state: TRACK_STATE_LABELS[l.track_state],
      notes: l.notes ?? "",
    };
    const m = sectorMap.get(l.id);
    for (let i = 1; i <= sectorsCount; i++) {
      const t = m?.get(i);
      values[`s${i}`] = t !== undefined ? toExcelTime(t) : "";
    }
    const row = sheet.addRow(values);
    row.getCell("lap").numFmt = TIME_FORMAT;
    row.getCell("tot").numFmt = TIME_FORMAT;
    row.getCell("delta").numFmt = DELTA_FORMAT;
    for (let i = 1; i <= sectorsCount; i++) row.getCell(`s${i}`).numFmt = TIME_FORMAT;
    if (l.id === stats.bestId) {
      row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFDC2626" } };
      });
    }
  }
  styleHeader(sheet);
}

function buildSectorsSheet(wb: ExcelJS.Workbook, sectors: LapSector[], sectorsCount: number) {
  const sheet = wb.addWorksheet("Sectores");
  sheet.columns = [
    { header: "Sector", key: "n", width: 16 },
    { header: "Mejor", key: "best", width: 14 },
    { header: "Vueltas con dato", key: "count", width: 18 },
  ];
  const best = bestSectorTimes(sectors, sectorsCount);
  for (let i = 1; i <= sectorsCount; i++) {
    const t = best[i - 1];
    const row = sheet.addRow({
      n: `S${i}`,
      best: t !== null ? toExcelTime(t) : "—",
      count: sectors.filter((s) => s.sector_number === i).length,
    });
    row.getCell("best").numFmt = TIME_FORMAT;
  }
  const theo = theoreticalBestLap(best);
  if (theo !== null) {
    sheet.addRow({});
    const row = sheet.addRow({ n: "Vuelta teórica", best: toExcelTime(theo), count: "" });
    row.getCell("best").numFmt = TIME_FORMAT;
    row.font = { bold: true, color: { argb: "FFDC2626" } };
  }
  styleHeader(sheet);
}

function buildStintsSheet(wb: ExcelJS.Workbook, laps: Lap[], events: LapEvent[]) {
  const sheet = wb.addWorksheet("Stints");
  sheet.columns = [
    { header: "Stint", key: "i", width: 8 },
    { header: "Vueltas", key: "n", width: 10 },
    { header: "Mejor", key: "best", width: 14 },
    { header: "Media", key: "avg", width: 14 },
    { header: "Desv. típica (s)", key: "sd", width: 16 },
    { header: "CV", key: "cv", width: 10 },
    { header: "Decay (s/v)", key: "decay", width: 14 },
    { header: "Parada previa", key: "pit", width: 14 },
  ];
  for (const s of computeStints(laps, events)) {
    const row = sheet.addRow({
      i: s.index,
      n: s.laps.length,
      best: s.bestMs !== null ? toExcelTime(s.bestMs) : "—",
      avg: s.averageMs !== null ? toExcelTime(s.averageMs) : "—",
      sd: s.stddevMs !== null ? s.stddevMs / 1000 : "—",
      cv: s.averageMs && s.stddevMs !== null ? s.stddevMs / s.averageMs : "—",
      decay: s.decayMsPerLap !== null ? s.decayMsPerLap / 1000 : "—",
      pit: s.pitInMs !== null ? toExcelTime(s.pitInMs) : "—",
    });
    row.getCell("best").numFmt = TIME_FORMAT;
    row.getCell("avg").numFmt = TIME_FORMAT;
    row.getCell("pit").numFmt = TIME_FORMAT;
    row.getCell("sd").numFmt = "0.000";
    row.getCell("cv").numFmt = "0.00%";
    row.getCell("decay").numFmt = DELTA_FORMAT;
  }
  styleHeader(sheet);
}

function buildEventsSheet(wb: ExcelJS.Workbook, events: LapEvent[]) {
  const sheet = wb.addWorksheet("Eventos");
  sheet.columns = [
    { header: "Tipo", key: "t", width: 22 },
    { header: "Vuelta", key: "n", width: 10 },
    { header: "Tiempo", key: "e", width: 14 },
    { header: "Notas", key: "notes", width: 40 },
    { header: "Registrado", key: "at", width: 22 },
  ];
  for (const ev of events) {
    const row = sheet.addRow({
      t: EVENT_TYPE_LABELS[ev.event_type],
      n: ev.lap_number ?? "",
      e: toExcelTime(ev.elapsed_ms),
      notes: ev.notes ?? "",
      at: new Date(ev.created_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
    });
    row.getCell("e").numFmt = TIME_FORMAT;
  }
  styleHeader(sheet);
}

function buildSetupSheet(wb: ExcelJS.Workbook, setup: Setup | null | undefined) {
  const sheet = wb.addWorksheet("Setup");
  sheet.columns = [
    { header: "Sección", key: "s", width: 22 },
    { header: "Campo", key: "f", width: 28 },
    { header: "Valor", key: "v", width: 32 },
  ];
  const groups: [string, unknown][] = setup
    ? [
        ["Dirección / delantero", setup.steering],
        ["Eje trasero / trasero", setup.rear_axle],
        ["Motor", setup.engine],
      ]
    : [];
  for (const [name, values] of groups) {
    for (const [k, v] of Object.entries((values ?? {}) as Record<string, unknown>)) {
      if (v === "" || v === null || v === undefined) continue;
      sheet.addRow({ s: name, f: k === "notes" ? "Notas" : k, v: String(v) });
    }
  }
  styleHeader(sheet);
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
  row.alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
