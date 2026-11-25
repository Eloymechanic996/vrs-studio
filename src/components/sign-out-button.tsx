"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(app)/actions";
import { useOutbox } from "@/lib/outbox";
import { clearPrivateCaches, forgetSyncedOutbox } from "@/lib/private-data";

export function SignOutButton() {
  const queue = useOutbox();

  async function onClick() {
    const pending = queue.filter((op) => !op.synced).length;
    if (
      pending > 0 &&
      !confirm(`Hay ${pending} datos sin enviar. Si sales, no se enviarán hasta que vuelvas a entrar. ¿Salir?`)
    ) {
      return;
    }
    await clearPrivateCaches().catch(() => {});
    forgetSyncedOutbox();
    await signOut();
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick}>
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Salir</span>
    </Button>
  );
}
