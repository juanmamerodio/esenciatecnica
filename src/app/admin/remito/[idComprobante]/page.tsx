import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import BotonDeImpresion from "@/components/admin/BotonDeImpresion";
import { formatPrice } from "@/lib/format";
import { leerRemito } from "@/lib/remito";
import { datosDelRemitoServidor } from "@/lib/remito-servidor";

/**
 * Remito imprimible — T8 · issue #14.
 *
 * Server Component detrás de la misma Basic Auth que el panel. Lee el remito que emitió la base
 * con el mismo módulo que lo envía por email (`leerRemito`): una sola validación y una sola
 * forma de leerlo. Si no hay remito, lo dice; no inventa un documento.
 */

export const dynamic = "force-dynamic";

export default async function RemitoPage({
  params,
}: {
  params: Promise<{ idComprobante: string }>;
}) {
  const { idComprobante } = await params;

  try {
    const resultado = await leerRemito(datosDelRemitoServidor(), idComprobante);

    if (resultado.estado === "error") {
      return (
        <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
          <FileText aria-hidden className="mx-auto h-12 w-12 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight text-text">Sin remito</h1>
          <p role="alert" className="text-sm leading-relaxed text-muted">
            {resultado.mensaje}
          </p>
          <Link href="/admin" className="btn-secondary gap-2">
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Volver al panel
          </Link>
        </div>
      );
    }

    const { datos } = resultado;

    return (
      <div className="mx-auto max-w-3xl space-y-8 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Volver al panel
          </Link>
          <BotonDeImpresion />
        </div>

        <article className="card space-y-8 p-6 sm:p-10">
          <header className="space-y-2 border-b border-border-soft pb-6">
            <span className="chip w-fit">Remito de venta</span>
            <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Remito {datos.numero}
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              {fechaLegible(datos.fecha)} · E.E.S.T N°1 Luciano Reyes · Campana, Buenos Aires
            </p>
          </header>

          <section className="space-y-1">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Cliente</h2>
            <p className="text-base font-semibold text-text">{datos.cliente.nombre}</p>
            <p className="text-sm text-muted">{datos.cliente.email}</p>
          </section>

          <table className="w-full text-sm">
            <caption className="sr-only">Productos del remito {datos.numero}</caption>
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th scope="col" className="py-2">Producto</th>
                <th scope="col" className="py-2 text-right">Cantidad</th>
                <th scope="col" className="py-2 text-right">Precio unitario</th>
                <th scope="col" className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {datos.items.map((item) => (
                <tr key={item.nombre} className="border-t border-border-soft">
                  <td className="py-2 pr-3 text-text">{item.nombre}</td>
                  <td className="py-2 text-right font-mono text-text">{item.cantidad}</td>
                  <td className="py-2 text-right font-mono text-text">
                    {formatPrice(item.precioUnitario)}
                  </td>
                  <td className="py-2 text-right font-mono text-text">{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <th scope="row" colSpan={3} className="py-3 text-right text-text">
                  Total
                </th>
                <td className="py-3 text-right font-mono text-xl font-bold tracking-tight text-text">
                  {formatPrice(datos.total)}
                </td>
              </tr>
            </tfoot>
          </table>

          <footer className="space-y-2 border-t border-border-soft pt-6 text-xs leading-relaxed text-muted">
            <p>
              El retiro o la entrega se acuerdan después de la aprobación del pago: este proyecto no
              incluye envío ni seguimiento.
            </p>
            <p>
              Esencia Técnica · Departamento de Química · Cosmética e higiene elaboradas por alumnos de
              7mo año.
            </p>
          </footer>
        </article>
      </div>
    );
  } catch (error) {
    console.error("No se pudo leer el remito:", error instanceof Error ? error.message : error);
    return (
      <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
        <FileText aria-hidden className="mx-auto h-12 w-12 text-accent" />
        <h1 className="text-2xl font-bold tracking-tight text-text">Panel sin configurar</h1>
        <p role="alert" className="text-sm leading-relaxed text-muted">
          Falta la clave de servicio de Supabase en el entorno del servidor, así que no se puede leer
          el remito. Avisá al equipo del proyecto.
        </p>
        <Link href="/admin" className="btn-secondary gap-2">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Volver al panel
        </Link>
      </div>
    );
  }
}

/** Fecha `AAAA-MM-DD` del modelo, legible y sin depender de la zona del navegador. */
function fechaLegible(fecha: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  if (!partes) return fecha;
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}
