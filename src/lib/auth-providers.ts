/**
 * ¿Qué inicios de sesión externos están activados en Supabase? Se consulta la
 * configuración pública de Auth (cacheada 5 minutos), así cada botón aparece
 * solo cuando su proveedor está configurado y no hay que tocar Vercel.
 */
export interface SocialLogins {
  google: boolean;
  microsoft: boolean;
}

export async function getSocialLogins(): Promise<SocialLogins> {
  const none = { google: false, microsoft: false };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return none;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return none;
    const settings = (await res.json()) as { external?: { azure?: boolean; google?: boolean } };
    return {
      google: settings.external?.google === true,
      microsoft: settings.external?.azure === true,
    };
  } catch {
    return none;
  }
}
