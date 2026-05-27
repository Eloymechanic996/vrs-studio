"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "vrs:install-dismissed-at";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as { MSStream?: unknown }).MSStream
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function dismissedRecently() {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const t = Number(raw);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS: no beforeinstallprompt; show manual hint after a short delay so it
    // doesn't flash before hydration is done.
    if (isIos()) {
      const t = setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage might be blocked (private mode); silently ignore.
    }
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar VRS Studio"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md sm:left-auto sm:right-4 sm:bottom-4 sm:mx-0"
    >
      <div className="relative rounded-xl border border-accent/30 bg-surface/95 p-4 shadow-[0_20px_60px_-20px_rgba(220,38,38,0.45)] backdrop-blur">
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute right-2 top-2 rounded p-1 text-muted hover:text-foreground hover:bg-surface-hover"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-orange-500 text-white">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Instalar VRS Studio</p>
            {showIosHint ? (
              <p className="mt-1 text-xs text-muted">
                Toca{" "}
                <Share className="inline h-3.5 w-3.5 align-text-bottom text-foreground" />{" "}
                <span className="text-foreground">Compartir</span> y luego{" "}
                <span className="text-foreground">
                  Agregar a la pantalla de inicio
                </span>{" "}
                para usarla como app.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                Instalala en tu dispositivo para acceso rapido y uso offline.
              </p>
            )}
          </div>
        </div>

        {!showIosHint ? (
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Ahora no
            </Button>
            <Button size="sm" onClick={install}>
              <Download className="h-3.5 w-3.5" />
              Instalar
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" size="sm" onClick={dismiss}>
              Entendido
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
