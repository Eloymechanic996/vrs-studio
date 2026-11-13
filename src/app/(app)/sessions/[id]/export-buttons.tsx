"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";

export function ExportButtons({ sessionId }: { sessionId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function exportWithTemplate(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("template", file);
      const response = await fetch(`/api/sessions/${sessionId}/export`, { method: "POST", body });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast({ message: data?.error ?? "No se pudo usar esa plantilla.", tone: "error" });
        return;
      }
      const blob = await response.blob();
      const name =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "sesion.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ message: "Sin conexión: no se pudo exportar.", tone: "error" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <a href={`/api/sessions/${sessionId}/export`}>
        <Button variant="secondary">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Excel</span>
        </Button>
      </a>
      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        title="Exportar sobre tu propia plantilla .xlsx"
        aria-label="Exportar sobre plantilla"
        onClick={() => inputRef.current?.click()}
      >
        <FileSpreadsheet className="h-4 w-4" />
      </Button>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void exportWithTemplate(file);
        }}
      />
    </>
  );
}
