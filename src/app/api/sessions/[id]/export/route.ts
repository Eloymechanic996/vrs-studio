import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime } from "@/lib/utils";
import {
  bestSectorTimes,
  computeLapStats,
  computeStints,
  consistencyLabel,
  formatDelta,
  lapDelta,
  theoreticalBestLap,
  totalPitTimeMs,
} from "@/lib/stats";
import type { Database } from "@/lib/supabase/types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type LapRow = Database["public"]["Tables"]["laps"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type SectorRow = Database["public"]["Tables"]["lap_sectors"]["Row"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: laps }, { data: events }, { data: setup }] = await Promise.all(
    [
      supabase
        .from("laps")
        .select("*")
        .eq("session_id", id)
        .order("lap_number", { ascending: true }),
      supabase
        .from("events")
        .select("*")
        .eq("session_id", id)
        .order("created_at", { ascending: true }),
      supabase.from("setups").select("*").eq("session_id", id).maybeSingle(),
    ],
  );

  const lapList = laps ?? [];
  const eventList = events ?? [];
  const lapIds = lapList.map((l) => l.id);
  const { data: sectorsData } =
    lapIds.length > 0
      ? await supabase.from("lap_sectors").select("*").in("lap_id", lapIds)
      : { data: [] as SectorRow[] };
  const sectorsList = (sectorsData ?? []) as SectorRow[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "VRS Studio";
  wb.created = new Date();

  buildSummarySheet(wb, session, lapList, eventList);
  buildLapsSheet(wb, lapList, sectorsList, session.sectors_count ?? 0);
  if ((session.sectors_count ?? 0) > 0) {
    buildSectorsSheet(wb, sectorsList, session.sectors_count);
  }
  buildStintsSheet(wb, lapList, eventList);
  buildEventsSheet(wb, eventList);
  buildSetupSheet(wb, setup);

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `${slug(session.name)}-${session.date}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function buildSummarySheet(
  wb: ExcelJS.Workbook,
  session: SessionRow,
  laps: LapRow[],
  events: EventRow[] = [],
) {
  const sheet = wb.addWorksheet("Resumen");
  sheet.columns = [
    { header: "Campo", key: "k", width: 26 },
    { header: "Valor", key: "v", width: 44 },
  ];

  const rows: [string, unknown][] = [
    ["Nombre", session.name],
    ["Modalidad", session.modality],
    ["Tipo de sesion", session.session_type],
    ["Categoria", session.category],
    ["Campeonato", session.championship],
    ["Equipo", session.team],
    ["Evento", session.event],
    ["Circuito", session.circuit],
    ["Fecha", session.date],
    ["Piloto", session.driver],
    ["Chasis", session.chassis],
    ["Motor", session.engine],
    ["Clima", session.weather],
    ["Temp. aire (C)", session.air_temp],
    ["Temp. pista (C)", session.track_temp],
    ["Notas", session.notes],
  ];
  for (const [k, v] of rows) {
    sheet.addRow({ k, v: v ?? "" });
  }

  const stats = computeLapStats(laps);
  const cons = consistencyLabel(stats.cv);
  sheet.addRow({});
  const statsHeader = sheet.addRow({ k: "Estadisticas de pace", v: "" });
  statsHeader.font = { bold: true };
  sheet.addRow({ k: "Vueltas totales", v: stats.count });
  sheet.addRow({ k: "Vueltas verdes (limpias)", v: stats.cleanCount });
  sheet.addRow({
    k: "Mejor vuelta",
    v: stats.bestMs !== null ? formatLapTime(stats.bestMs) : "—",
  });
  sheet.addRow({
    k: "Media (vueltas limpias)",
    v: stats.averageMs !== null ? formatLapTime(stats.averageMs) : "—",
  });
  sheet.addRow({
    k: "Desviacion tipica",
    v:
      stats.stddevMs !== null
        ? `±${(stats.stddevMs / 1000).toFixed(3)} s`
        : "—",
  });
  sheet.addRow({
    k: "Coef. de variacion",
    v: stats.cv !== null ? `${(stats.cv * 100).toFixed(2)} %` : "—",
  });
  sheet.addRow({ k: "Consistencia", v: cons.label });

  const pitTotal = totalPitTimeMs(events);
  if (pitTotal > 0) {
    sheet.addRow({
      k: "Tiempo total en pits",
      v: formatLapTime(pitTotal),
    });
  }

  styleHeader(sheet);
}

function buildLapsSheet(
  wb: ExcelJS.Workbook,
  laps: LapRow[],
  sectors: SectorRow[],
  sectorsCount: number,
) {
  const sheet = wb.addWorksheet("Tiempos");
  const baseCols: { header: string; key: string; width: number }[] = [
    { header: "Vuelta", key: "n", width: 10 },
    { header: "Tiempo", key: "lap", width: 14 },
    { header: "Delta mejor", key: "delta", width: 14 },
    { header: "Acumulado", key: "tot", width: 14 },
  ];
  for (let i = 1; i <= sectorsCount; i++) {
    baseCols.push({ header: `S${i}`, key: `s${i}`, width: 12 });
  }
  baseCols.push(
    { header: "Estado pista", key: "state", width: 22 },
    { header: "Notas", key: "notes", width: 40 },
  );
  sheet.columns = baseCols;

  const stats = computeLapStats(laps);
  const sectorMap = new Map<string, Map<number, number>>();
  for (const s of sectors) {
    let m = sectorMap.get(s.lap_id);
    if (!m) {
      m = new Map();
      sectorMap.set(s.lap_id, m);
    }
    m.set(s.sector_number, s.time_ms);
  }

  for (const l of laps) {
    const delta = lapDelta(l.lap_time_ms, stats.bestMs);
    const row: Record<string, unknown> = {
      n: l.lap_number,
      lap: formatLapTime(l.lap_time_ms),
      delta: l.id === stats.bestId ? "—" : formatDelta(delta),
      tot: formatLapTime(l.total_time_ms),
      state: l.track_state,
      notes: l.notes ?? "",
    };
    const m = sectorMap.get(l.id);
    for (let i = 1; i <= sectorsCount; i++) {
      const t = m?.get(i);
      row[`s${i}`] = t !== undefined ? formatLapTime(t) : "";
    }
    sheet.addRow(row);
  }
  styleHeader(sheet);
  highlightBest(sheet, laps);
}

function buildSectorsSheet(
  wb: ExcelJS.Workbook,
  sectors: SectorRow[],
  sectorsCount: number,
) {
  const sheet = wb.addWorksheet("Sectores");
  sheet.columns = [
    { header: "Sector", key: "n", width: 10 },
    { header: "Mejor", key: "best", width: 14 },
    { header: "Vueltas con dato", key: "count", width: 18 },
  ];
  const best = bestSectorTimes(sectors, sectorsCount);
  for (let i = 1; i <= sectorsCount; i++) {
    const count = sectors.filter((s) => s.sector_number === i).length;
    sheet.addRow({
      n: `S${i}`,
      best: best[i - 1] !== null ? formatLapTime(best[i - 1]!) : "—",
      count,
    });
  }
  const theo = theoreticalBestLap(best);
  if (theo !== null) {
    sheet.addRow({});
    const row = sheet.addRow({
      n: "Vuelta teorica",
      best: formatLapTime(theo),
      count: "",
    });
    row.font = { bold: true, color: { argb: "FFDC2626" } };
  }
  styleHeader(sheet);
}

function buildStintsSheet(
  wb: ExcelJS.Workbook,
  laps: LapRow[],
  events: EventRow[],
) {
  const sheet = wb.addWorksheet("Stints");
  sheet.columns = [
    { header: "Stint", key: "i", width: 8 },
    { header: "Vueltas", key: "n", width: 10 },
    { header: "Mejor", key: "best", width: 14 },
    { header: "Media", key: "avg", width: 14 },
    { header: "Desv. tipica", key: "sd", width: 14 },
    { header: "CV %", key: "cv", width: 10 },
    { header: "Decay (s/v)", key: "decay", width: 14 },
    { header: "Pit anterior", key: "pit", width: 14 },
  ];
  const stints = computeStints(laps, events);
  for (const s of stints) {
    sheet.addRow({
      i: s.index,
      n: s.laps.length,
      best: s.bestMs !== null ? formatLapTime(s.bestMs) : "—",
      avg: s.averageMs !== null ? formatLapTime(s.averageMs) : "—",
      sd:
        s.stddevMs !== null
          ? `±${(s.stddevMs / 1000).toFixed(3)}`
          : "—",
      cv:
        s.averageMs && s.stddevMs
          ? `${((s.stddevMs / s.averageMs) * 100).toFixed(2)}`
          : "—",
      decay:
        s.decayMsPerLap !== null
          ? (s.decayMsPerLap / 1000).toFixed(3)
          : "—",
      pit: s.pitInMs !== null ? formatLapTime(s.pitInMs) : "—",
    });
  }
  styleHeader(sheet);
}

function buildEventsSheet(
  wb: ExcelJS.Workbook,
  events: Array<{
    event_type: string;
    lap_number: number | null;
    elapsed_ms: number;
    notes: string | null;
    created_at: string;
  }>,
) {
  const sheet = wb.addWorksheet("Eventos");
  sheet.columns = [
    { header: "Tipo", key: "t", width: 22 },
    { header: "Vuelta", key: "n", width: 10 },
    { header: "Tiempo", key: "e", width: 14 },
    { header: "Notas", key: "notes", width: 40 },
    { header: "Registrado", key: "at", width: 22 },
  ];
  for (const ev of events) {
    sheet.addRow({
      t: ev.event_type,
      n: ev.lap_number ?? "",
      e: formatLapTime(ev.elapsed_ms),
      notes: ev.notes ?? "",
      at: new Date(ev.created_at).toLocaleString(),
    });
  }
  styleHeader(sheet);
}

function buildSetupSheet(
  wb: ExcelJS.Workbook,
  setup:
    | {
        steering: unknown;
        rear_axle: unknown;
        engine: unknown;
      }
    | null
    | undefined,
) {
  const sheet = wb.addWorksheet("Setup");
  sheet.columns = [
    { header: "Seccion", key: "s", width: 22 },
    { header: "Campo", key: "f", width: 28 },
    { header: "Valor", key: "v", width: 32 },
  ];
  if (!setup) {
    styleHeader(sheet);
    return;
  }
  const groups: Array<[string, Record<string, unknown>]> = [
    ["Direccion", (setup.steering as Record<string, unknown>) ?? {}],
    ["Eje trasero", (setup.rear_axle as Record<string, unknown>) ?? {}],
    ["Motor", (setup.engine as Record<string, unknown>) ?? {}],
  ];
  for (const [name, obj] of groups) {
    for (const [k, v] of Object.entries(obj)) {
      sheet.addRow({ s: name, f: k, v: String(v ?? "") });
    }
  }
  styleHeader(sheet);
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDC2626" },
  };
  row.alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function highlightBest(
  sheet: ExcelJS.Worksheet,
  laps: Array<{ lap_time_ms: number }>,
) {
  if (laps.length === 0) return;
  let bestIdx = 0;
  for (let i = 1; i < laps.length; i++) {
    if (laps[i].lap_time_ms < laps[bestIdx].lap_time_ms) bestIdx = i;
  }
  const row = sheet.getRow(bestIdx + 2);
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFDC2626" } };
  });
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
