import { notFound } from "next/navigation";
import { SessionForm } from "@/components/session-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  if (!session) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Editar sesión</h1>
        <p className="text-sm text-muted">{session.name}</p>
      </div>
      <SessionForm session={session} />
    </div>
  );
}
