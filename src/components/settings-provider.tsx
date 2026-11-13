"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { saveSettings } from "@/app/(app)/actions";
import {
  applyThemeToDocument,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type UserSettings,
} from "@/lib/settings";
import { useToast } from "@/components/toast";

interface SettingsContextValue {
  settings: UserSettings;
  update: (change: Partial<UserSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

function persistLocally(settings: UserSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Sin almacenamiento local se siguen aplicando en esta visita.
  }
}

export function SettingsProvider({
  initial,
  children,
}: {
  initial: UserSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(initial);
  const settingsRef = useRef(initial);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  useEffect(() => {
    applyThemeToDocument(settingsRef.current);
    persistLocally(settingsRef.current);
  }, []);

  useEffect(() => {
    if (settings.theme !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyThemeToDocument(settingsRef.current);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings.theme]);

  const update = useCallback(
    (change: Partial<UserSettings>) => {
      const next = { ...settingsRef.current, ...change };
      settingsRef.current = next;
      setSettings(next);
      applyThemeToDocument(next);
      persistLocally(next);

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const result = await saveSettings(settingsRef.current);
          if (!result.ok) toast({ message: result.error, tone: "error" });
        } catch {
          toast({
            message: "Sin conexión: los ajustes se aplican en este dispositivo.",
            tone: "error",
          });
        }
      }, 600);
    },
    [toast],
  );

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
