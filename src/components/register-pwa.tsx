"use client";

import { useEffect } from "react";

export function RegisterPWA() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      // @ts-expect-error - injected by @serwist/next
      window.serwist !== undefined
    ) {
      // @ts-expect-error - injected by @serwist/next
      window.serwist.register();
    }
  }, []);

  return null;
}
