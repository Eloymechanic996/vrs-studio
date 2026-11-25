import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  Plus,
  Search,
  Timer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSION_TYPE_LABELS, SESSION_TYPES } from "@/lib/labels";
import { computeLapStats } from "@/lib/stats";
import type { Lap, SessionType } from "@/lib/supabase/types";
import { formatLapTime, parseDateOnly } from "@/lib/utils";
import { todayISO, upcomingLabel } from "@/lib/session-dates";

const PAGE_SIZE = 24;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    type?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  // Un parámetro repetido en la URL (?q=a&q=b) llega como lista: se usa el primero.
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = first(params.q).trim().slice(0, 100);
  const type = SESSION_TYPES.find((t) => t === first(params.type)) as SessionType | undefined;
  const requestedPage = Math.trunc(Number(first(params.page)));
  const page =
    Number.isFinite(requestedPage) && requestedPage > 1 ? Math.min(requestedPage, 10000) : 1;

  const filtering = Boolean(q || type);
  const today = todayISO();
  const supabase = await createClient();
  let query = supabase
    .from("sessions")
    .select("id, name, modality, session_type, circuit, driver, date, laps(*)", { count: "exact" })
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (type) query = query.eq("session_type", type);
  // Sin filtros, las sesiones preparadas para otro día van aparte, arriba.
  if (!filtering) query = query.lte("date", today);
  if (q) {
    // Coma, paréntesis y comillas tienen significado en el filtro de PostgREST.
    const safe = q.replace(/[,()"\\%*]/g, " ").trim();
    if (safe)
      query = query.or(`name.ilike.%${safe}%,circuit.ilike.%${safe}%,driver.ilike.%${safe}%`);
  }

  const [{ data: sessions, count, error }, { data: upcoming }] = await Promise.all([
    query,
    !filtering && page === 1
      ? supabase
          .from("sessions")
          .select("id, name, modality, session_type, circuit, driver, date")
          .gt("date", today)
          .order("date", { ascending: true })
          .order("created_at", { ascending: true })
          .limit(12)
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            modality: string;
            session_type: SessionType;
            circuit: string | null;
            driver: string | null;
            date: string;
          }[],
        }),
  ]);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasUpcoming = (upcoming ?? []).length > 0;

  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (type) sp.set("type", type);
    if (n > 1) sp.set("page", String(n));
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  };

  // Página que no existe (?page=99): a la última que sí tiene sesiones.
  if (page > totalPages && count !== null) redirect(pageHref(totalPages));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sesiones</h1>
          <p className="text-sm text-muted">Tus tests, carreras y libres.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/compare">
            <Button variant="secondary" size="lg">
              <GitCompare className="h-4 w-4" />
              Comparar
            </Button>
          </Link>
          <Link href="/sessions/new">
            <Button size="lg">
              <Plus className="h-4 w-4" />
              Nueva sesión
            </Button>
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-2" role="search">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, circuito o piloto"
          aria-label="Buscar sesiones"
          className="min-w-52 flex-1"
        />
        <Select name="type" defaultValue={type ?? ""} aria-label="Tipo de sesión" className="w-40">
          <option value="">Todos los tipos</option>
          {SESSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {SESSION_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </form>

      {hasUpcoming ? (
        <section aria-labelledby="upcoming-title" className="flex flex-col gap-3">
          <h2
            id="upcoming-title"
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-info"
          >
            <CalendarClock className="h-4 w-4" />
            Próximas sesiones
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(upcoming ?? []).map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`} className="group block">
                <Card className="h-full border-dashed border-info/40 transition-all group-hover:border-info group-hover:bg-surface">
                  <CardHeader className="border-b-0 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="truncate">{s.name}</CardTitle>
                      <Badge variant="info" className="shrink-0">
                        {upcomingLabel(s.date, today)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="accent">{SESSION_TYPE_LABELS[s.session_type]}</Badge>
                      <Badge variant="muted">{s.modality}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 pt-3 text-xs text-muted">
                    <div>
                      <p className="uppercase tracking-wider">Fecha</p>
                      <p className="text-foreground tabular">
                        {format(parseDateOnly(s.date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider">Circuito</p>
                      <p className="truncate text-foreground">{s.circuit || "-"}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <h2 className="mt-2 text-sm font-semibold uppercase tracking-wider text-muted">
            Historial
          </h2>
        </section>
      ) : null}

      {error && !sessions ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CardTitle>No se pudieron cargar tus sesiones</CardTitle>
            <CardDescription>
              Tus datos siguen guardados. Comprueba la conexión y recarga la página.
            </CardDescription>
            <Link href="/" className="mt-2">
              <Button variant="secondary">Reintentar</Button>
            </Link>
          </CardContent>
        </Card>
      ) : !sessions || sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <Timer className="h-6 w-6" />
            </div>
            <CardTitle>
              {filtering
                ? "Sin resultados"
                : hasUpcoming
                  ? "Aún no has corrido ninguna"
                  : "Sin sesiones todavía"}
            </CardTitle>
            <CardDescription>
              {filtering
                ? "Prueba con otra búsqueda."
                : hasUpcoming
                  ? "Aquí aparecerán tus sesiones a partir del día en que las corras."
                  : "Crea tu primera sesión para empezar a registrar tiempos, o prepárala para otro día."}
            </CardDescription>
            {!filtering && !hasUpcoming ? (
              <Link href="/sessions/new" className="mt-2">
                <Button>
                  <Plus className="h-4 w-4" />
                  Crear sesión
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => {
            const stats = computeLapStats((s.laps ?? []) as Lap[]);
            return (
              <Link key={s.id} href={`/sessions/${s.id}`} className="group block">
                <Card className="h-full transition-all group-hover:border-accent/40 group-hover:bg-surface">
                  <CardHeader className="border-b-0 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="truncate">{s.name}</CardTitle>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="accent">{SESSION_TYPE_LABELS[s.session_type]}</Badge>
                      <Badge variant="muted">{s.modality}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 pt-3 text-xs text-muted">
                    <div>
                      <p className="uppercase tracking-wider">Fecha</p>
                      <p className="text-foreground tabular">
                        {format(parseDateOnly(s.date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider">Circuito</p>
                      <p className="truncate text-foreground">{s.circuit || "-"}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider">Piloto</p>
                      <p className="truncate text-foreground">{s.driver || "-"}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider">Mejor · {stats.count} v.</p>
                      <p className="tabular text-accent">
                        {stats.bestMs !== null ? formatLapTime(stats.bestMs) : "—"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-3" aria-label="Páginas">
          {page > 1 ? (
            <Link href={pageHref(page - 1)}>
              <Button variant="secondary" size="icon" aria-label="Página anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}
          <span className="text-sm text-muted">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)}>
              <Button variant="secondary" size="icon" aria-label="Página siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
