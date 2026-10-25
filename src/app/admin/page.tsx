import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Panel en migración — consecuencia declarada de T5 (issue #10).
 *
 * El camino legacy de compra se retiró con T5: el endpoint de pedidos viejo ya no existe, y el
 * panel consultaba la tabla `pedidos`, que tampoco. Antes que dejar una pantalla que promete
 * datos que no puede leer, queda este aviso; T7 lo reemplaza por el panel del contrato
 * canónico (pedidos, stock, alertas y comprobantes).
 */
export default function AdminPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
      <ShieldCheck aria-hidden className="mx-auto h-12 w-12 text-accent" />
      <h1 className="text-2xl font-bold tracking-tight text-text">Panel en migración</h1>
      <p className="text-sm leading-relaxed text-muted">
        La gestión de pedidos y stock vuelve con el contrato del modelo aprobado. Mientras tanto, la
        validación de comprobantes se hace por fuera del sitio.
      </p>
      <Link href="/" className="btn-secondary gap-2">
        Volver a la tienda
        <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>
  );
}
