import Link from "next/link";
import { LogOut, Timer } from "lucide-react";
import { signOut } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";

export function AppShell({
  user,
  children,
}: {
  user: { email?: string | null };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-accent to-orange-500 text-white shadow-[0_4px_20px_-2px_var(--color-accent-glow)]">
              <Timer className="h-4 w-4" />
            </span>
            <span className="font-bold tracking-tight text-lg">
              VRS<span className="text-accent">.</span>
            </span>
            <span className="text-xs uppercase tracking-widest text-muted hidden sm:inline">
              Studio
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted/70 sm:px-6">
          VRS Studio - Control de competicion
        </div>
      </footer>
    </div>
  );
}
