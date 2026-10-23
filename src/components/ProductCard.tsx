import { formatPrice } from "@/lib/format";
import type { ProductoCatalogo } from "@/lib/catalogo";
import ImagenProducto from "@/components/ImagenProducto";

/**
 * Card de producto: única, con estados `ok`, `sin-stock` y `sin-imagen` (HU-2, HU-3,
 * HU-5). No muestra unidades disponibles — la Home no las publica.
 *
 * El control de "agregar al carrito" llega en T4; esta card no promete lo que todavía no
 * existe.
 */
export default function ProductCard({ producto }: { producto: ProductoCatalogo }) {
  return (
    <article className="card card-interactive group flex h-full flex-col overflow-hidden">
      <ImagenProducto url={producto.imagenUrl} nombre={producto.nombre} categoria={producto.categoria} />

      <div className="flex flex-grow flex-col p-5">
        <span className="chip w-fit">{producto.categoria}</span>
        <h3 className="mt-3 text-lg font-bold leading-tight text-text">{producto.nombre}</h3>
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
          ) : null}
        </div>
      </div>
    </article>
  );
}
