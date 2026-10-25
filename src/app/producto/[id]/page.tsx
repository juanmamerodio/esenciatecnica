import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Info } from "lucide-react";
import AgregarAlCarrito from "@/components/AgregarAlCarrito";
import GrillaProductos from "@/components/GrillaProductos";
import ImagenProducto from "@/components/ImagenProducto";
import { formatPrice } from "@/lib/format";
import { leerCatalogo } from "@/lib/catalogo-servidor";

/**
 * Detalle de producto — T3 · issue #8 (decisión G2: página propia).
 *
 * Un solo lector del catálogo: la página reutiliza `leerCatalogo` y busca el producto en el
 * resultado que ya viene filtrado por `vista_catalogo`. Como la vista solo devuelve productos
 * activos, un producto dado de baja no es accesible por URL directa y esa regla no depende del
 * cliente. No se agregan campos: el detalle muestra lo que el modelo tiene.
 */

// El catálogo cambia con el stock: no se cachea una foto vieja de la tienda.
export const dynamic = "force-dynamic";

type Ruta = { id: string };

/** El id de la URL es un entero positivo: cualquier otra cosa no es un producto. */
function idDeRuta(valor: string): number | null {
  if (!/^[0-9]+$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default async function DetalleProductoPage({ params }: { params: Promise<Ruta> }) {
  const { id } = await params;
  const identificador = idDeRuta(id);
  if (identificador === null) notFound();

  const resultado = await leerCatalogo();

  // El estado de error es el mismo que el de la grilla: una sola pieza para el mismo concepto.
  if (resultado.estado === "error") {
    return (
      <div className="pb-20">
        <GrillaProductos resultado={resultado} mensajeVacio="Producto no disponible" />
      </div>
    );
  }

  const producto = resultado.productos.find((fila) => fila.id === identificador);
  if (!producto) notFound();

  return (
    <div className="space-y-10 pb-20">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-2 text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
          <ImagenProducto
            url={producto.imagenUrl}
            nombre={producto.nombre}
            categoria={producto.categoria}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip">{producto.categoria}</span>
            {producto.tipo ? (
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                {producto.tipo}
              </span>
            ) : null}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">{producto.nombre}</h1>

          <p className="text-base leading-relaxed text-muted">{producto.descripcion}</p>

          <p className="font-mono text-3xl font-bold tracking-tight text-text">
            {formatPrice(producto.precio)}{" "}
            <span className="font-sans text-sm font-normal text-muted">ARS</span>
          </p>

          <dl className="flex items-start gap-3 rounded-card border border-border-soft bg-surface p-4">
            <Clock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Producción estimada
              </dt>
              <dd className="text-sm font-semibold text-text">
                {producto.tiempoProduccion > 0
                  ? `${producto.tiempoProduccion} ${producto.tiempoProduccion === 1 ? "día" : "días"}`
                  : "Elaboración inmediata"}
              </dd>
              <dd className="mt-1 text-xs leading-relaxed text-muted">
                Es el tiempo de elaboración del Departamento de Química, no un plazo de entrega.
              </dd>
            </div>
          </dl>

          <p className="flex items-start gap-3 text-xs leading-relaxed text-muted">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              El pago es por transferencia y lo valida a mano un Administrador de Química. El retiro o la
              entrega se acuerdan después de aprobar el pago: el proyecto no incluye envío ni seguimiento.
            </span>
          </p>

          {producto.sinStock ? (
            <span className="inline-block rounded-pill border border-border px-4 py-2 text-xs font-semibold text-muted">
              Sin stock
            </span>
          ) : (
            <AgregarAlCarrito producto={producto} />
          )}
        </div>
      </div>
    </div>
  );
}
