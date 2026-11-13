import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-lg font-bold">Página no encontrada</h1>
        <p className="mt-1 text-sm text-muted">
          El enlace no existe o la sesión ya no está compartida.
        </p>
        <Link href="/" className="mt-4 inline-block">
          <Button>Ir al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
