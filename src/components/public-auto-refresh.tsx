"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** La vista pública no tiene sesión de usuario: se actualiza cada pocos segundos. */
export function PublicAutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(interval);
  }, [router, seconds]);

  return null;
}
