"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleSessionPublic } from "@/app/(app)/actions";

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

  const url =
    typeof window !== "undefined" && slug
      ? `${window.location.origin}/s/${slug}`
      : slug
        ? `/s/${slug}`
        : null;

  function toggle() {
    startTransition(async () => {
      await toggleSessionPublic({
        session_id: sessionId,
        make_public: !isPublic,
      });
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  if (!isPublic) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        disabled={pending}
        title="Compartir publicamente"
      >
        <Lock className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Privada</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-2 py-1.5">
      <Link2 className="h-3.5 w-3.5 text-accent" />
      {url ? (
        <span className="tabular text-xs text-muted max-w-[180px] sm:max-w-[260px] truncate">
          {url.replace(/^https?:\/\//, "")}
        </span>
      ) : (
        <span className="text-xs text-muted">Generando link...</span>
      )}
      <button
        onClick={copy}
        className="rounded p-1 text-muted hover:text-foreground hover:bg-surface"
        aria-label="Copiar link"
        disabled={!url}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        onClick={toggle}
        disabled={pending}
        className="text-[11px] text-muted hover:text-foreground border-l border-border/60 pl-2"
      >
        Hacer privada
      </button>
    </div>
  );
}
