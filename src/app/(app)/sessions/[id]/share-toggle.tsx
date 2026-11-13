"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Link2, Lock } from "lucide-react";
import { toggleSessionPublic } from "@/app/(app)/actions";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";

export function ShareToggle({
  sessionId,
  isPublic,
  slug,
}: {
  sessionId: string;
  isPublic: boolean;
  slug: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const toast = useToast();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window solo existe en el navegador
    setOrigin(window.location.origin);
  }, []);

  const url = slug ? `${origin}/s/${slug}` : null;

  function toggle() {
    startTransition(async () => {
      try {
        const result = await toggleSessionPublic({ session_id: sessionId, make_public: !isPublic });
        if (!result.ok) toast({ message: result.error, tone: "error" });
      } catch {
        toast({ message: "Sin conexión: no se pudo cambiar la visibilidad.", tone: "error" });
      }
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ message: "No se pudo copiar el enlace.", tone: "error" });
    }
  }

  if (!isPublic) {
    return (
      <Button variant="ghost" size="sm" onClick={toggle} disabled={pending} title="Crear enlace público">
        <Lock className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Privada</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-2 py-1.5">
      <Link2 className="h-3.5 w-3.5 text-accent" />
      <span className="tabular max-w-[180px] truncate text-xs text-muted sm:max-w-[260px]">
        {url?.replace(/^https?:\/\//, "")}
      </span>
      <button
        type="button"
        onClick={copy}
        className="rounded p-1 text-muted hover:bg-surface hover:text-foreground"
        aria-label="Copiar enlace"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="border-l border-border/60 pl-2 text-xs text-muted hover:text-foreground"
      >
        Hacer privada
      </button>
    </div>
  );
}
