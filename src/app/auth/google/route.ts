import type { NextRequest } from "next/server";
import { startOAuth } from "@/lib/oauth-start";

/** "Continuar con Google". */
export function GET(request: NextRequest) {
  return startOAuth(request, "google");
}
