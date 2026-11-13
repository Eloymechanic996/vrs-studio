import Link from "next/link";
import { Settings, Timer } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { OutboxSync } from "@/components/outbox-sync";
import { SignOutButton } from "@/components/sign-out-button";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; avatarUrl: string | null };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-accent to-accent-2 text-on-accent">
              <Timer className="h-4 w-4" />
            </span>
            <span className="font-bold tracking-tight text-lg">
              VRS<span className="text-accent">.</span>
            </span>
            <span className="text-xs uppercase tracking-widest text-muted hidden sm:inline">
              Studio
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <OutboxSync />
            <Link
              href="/profile"
              aria-label="Perfil"
              title="Perfil"
              className="flex items-center gap-2 rounded-full pr-1 text-xs text-muted hover:text-foreground md:pr-2"
            >
              <Avatar src={user.avatarUrl} name={user.name} />
              <span className="hidden max-w-40 truncate md:inline">{user.name}</span>
            </Link>
            <Link
              href="/settings"
              aria-label="Configuración"
              title="Configuración"
              className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-background/60">
        <div className="mx-auto flex max-w-7xl justify-center gap-3 px-4 py-4 text-xs text-muted sm:px-6">
          <span>VRS Studio · Control de competición</span>
          <Link href="/privacidad" className="hover:text-foreground">
            Privacidad
          </Link>
        </div>
      </footer>
    </div>
  );
}
