import type { NextRequest } from "next/server";
import { startOAuth } from "@/lib/oauth-start";

/** "Continuar con Microsoft" (cuentas del campus o personales). */
export function GET(request: NextRequest) {
  return startOAuth(request, "microsoft");
}
