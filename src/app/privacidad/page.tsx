import Link from "next/link";

export const metadata = { title: "Privacidad" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-sm leading-relaxed text-foreground">
      <h1 className="text-2xl font-bold tracking-tight">Política de privacidad</h1>
      <p className="mt-2 text-muted">Resumen de qué datos guarda VRS Studio y cómo controlarlos.</p>

      <h2 className="mt-6 font-semibold">Qué datos se guardan</h2>
      <p className="mt-1 text-muted">
        Tu correo y una contraseña cifrada para iniciar sesión, los datos de perfil que quieras
        añadir (nombre, equipo, dorsal, foto…) y lo que registres: sesiones, vueltas, eventos,
        setup y preferencias. No se usan cookies publicitarias; solo las
        necesarias para mantener tu sesión iniciada.
      </p>

      <h2 className="mt-6 font-semibold">Dónde se guardan</h2>
      <p className="mt-1 text-muted">
        En servidores de Supabase en la Unión Europea (Irlanda). La web se sirve desde Vercel. Las
        vueltas pendientes de enviar permanecen temporalmente en tu dispositivo.
      </p>

      <h2 className="mt-6 font-semibold">Quién puede verlos</h2>
      <p className="mt-1 text-muted">
        Tus datos son privados y solo accesibles desde tu cuenta. Si activas el enlace público de
        una sesión, quien tenga el enlace verá su nombre, modalidad, circuito, piloto, fecha y
        tiempos. El setup y las notas de la sesión no se comparten.
      </p>

      <h2 className="mt-6 font-semibold">Tus derechos</h2>
      <p className="mt-1 text-muted">
        Desde Configuración puedes descargar todos tus datos y borrar tu cuenta. Al borrarla se
        eliminan de forma definitiva todas tus sesiones. Para cualquier otra petición, contacta con
        la persona que administra esta aplicación.
      </p>

      <p className="mt-8">
        <Link href="/" className="text-accent hover:underline">
          Volver a VRS Studio
        </Link>
      </p>
    </main>
  );
}
