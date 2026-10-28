import Link from "next/link";
import { Clock } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { textoDeProduccion, type ProductoCatalogo } from "@/lib/catalogo";
import AgregarAlCarrito from "@/components/AgregarAlCarrito";
import ImagenProducto from "@/components/ImagenProducto";

/**
 * Card de producto: única, con estados `ok`, `sin-stock` y `sin-imagen` (HU-2, HU-3,
 * HU-5). No muestra unidades disponibles — la Home no las publica. La imagen y el título
 * llevan al detalle (T3), que es donde está la descripción completa.
 *
 * `muestraProduccion` publica el tiempo de producción en la card del **catálogo** (el Cliente
 * decide sin abrir cada producto); la Home no lo publica (#38). Un producto con cero días
 * —elaboración inmediata— no inventa un «0 días»: se dice con palabras.
 */
export default function ProductCard({
  producto,
  muestraProduccion = false,
}: {
  producto: ProductoCatalogo;
  muestraProduccion?: boolean;
}) {
  const urlDelDetalle = `/producto/${producto.id}`;

  return (
    <article className="card card-interactive group flex h-full flex-col overflow-hidden">
      <Link href={urlDelDetalle} aria-label={`Ver el detalle de ${producto.nombre}`} className="block">
        <ImagenProducto url={producto.imagenUrl} nombre={producto.nombre} categoria={producto.categoria} />
      </Link>

      <div className="flex flex-grow flex-col p-5">
        <span className="chip w-fit">{producto.categoria}</span>
        <h3 className="mt-3 text-lg font-bold leading-tight text-text">
          <Link href={urlDelDetalle} className="underline-offset-4 hover:text-accent hover:underline">
            {producto.nombre}
          </Link>
        </h3>
        {muestraProduccion ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Clock aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent" />
            {textoDeProduccion(producto.tiempoProduccion)}
          </p>
        ) : null}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{producto.descripcion}</p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-soft pt-4">
          <p className="font-mono text-xl font-bold tracking-tight text-text">
            {formatPrice(producto.precio)}{" "}
            <span className="font-sans text-xs font-normal text-muted">ARS</span>
          </p>
          {producto.sinStock ? (
            <span className="rounded-pill border border-border px-4 py-2 text-xs font-semibold text-muted">
              Sin stock
            </span>
          ) : (
            <AgregarAlCarrito producto={producto} />
          )}
        </div>
      </div>
    </article>
  );
}
