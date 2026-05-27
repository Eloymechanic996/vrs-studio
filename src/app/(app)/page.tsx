import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, GitCompare, Plus, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, modality, session_type, circuit, driver, date")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sesiones</h1>
          <p className="text-sm text-muted">
            Tus tests, carreras y libres.
          </p>
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
              Nueva sesion
            </Button>
          </Link>
        </div>
      </div>

      {!sessions || sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <Timer className="h-6 w-6" />
            </div>
            <CardTitle>Sin sesiones todavia</CardTitle>
            <CardDescription>
              Crea tu primera sesion para empezar a registrar tiempos.
            </CardDescription>
            <Link href="/sessions/new" className="mt-2">
              <Button>
                <Plus className="h-4 w-4" />
                Crear sesion
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="group block"
            >
              <Card className="h-full transition-all group-hover:border-accent/40 group-hover:bg-surface">
                <CardHeader className="border-b-0 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{s.name}</CardTitle>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="accent">{s.session_type}</Badge>
                    <Badge variant="muted">{s.modality}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 pt-3 text-xs text-muted">
                  <div>
                    <p className="text-muted/60 uppercase tracking-wider">
                      Fecha
                    </p>
                    <p className="text-foreground tabular">
                      {format(new Date(s.date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted/60 uppercase tracking-wider">
                      Circuito
                    </p>
                    <p className="text-foreground truncate">
                      {s.circuit || "-"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted/60 uppercase tracking-wider">
                      Piloto
                    </p>
                    <p className="text-foreground truncate">{s.driver || "-"}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
