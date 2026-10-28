import type { ReactNode } from "react";
import { PackageOpen, TriangleAlert } from "lucide-react";
import type { ResultadoCatalogo } from "@/lib/catalogo";
import ProductCard from "@/components/ProductCard";

/**
 * Grilla de productos con sus estados diseñados. Vacío y error son distintos y se
 * distinguen a simple vista (HU-4): el vacío es una tienda sin publicar, el error es una
 * falla de lectura. Nunca se silencia un error con un `console.error` y una grilla vacía.
 */
export default function GrillaProductos({
  resultado,
  mensajeVacio,
  detalleVacio,
  accionVacio,
  muestraProduccion = false,
}: {
  resultado: ResultadoCatalogo;
  mensajeVacio: string;
  detalleVacio?: string;
  accionVacio?: ReactNode;
  /** El catálogo publica el tiempo de producción en la card; la Home no (#38). */
  muestraProduccion?: boolean;
}) {
  if (resultado.estado === "error") {
    return (
      <div className="card border-dashed p-12 text-center">
        <TriangleAlert aria-hidden className="mx-auto h-10 w-10 text-accent" />
        <h3 className="mt-4 text-lg font-semibold text-text">No pudimos cargar el catálogo</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          Volvé a intentar en unos minutos. Si sigue igual, escribinos a{" "}
          <a href="mailto:proyectos@esenciatecnica.edu.ar" className="underline underline-offset-4">
            proyectos@esenciatecnica.edu.ar
          </a>
          .
        </p>
        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted">Detalle técnico: {resultado.mensaje}</p>
        ) : null}
      </div>
    );
  }

  if (resultado.productos.length === 0) {
    return (
      <div className="card border-dashed p-12 text-center">
        <PackageOpen aria-hidden className="mx-auto h-10 w-10 text-muted" />
        <h3 className="mt-4 text-lg font-semibold text-text">{mensajeVacio}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {detalleVacio ?? "La tienda se llena a medida que el Departamento de Química publica sus elaboraciones."}
        </p>
        {accionVacio ? <div className="mt-6 flex justify-center">{accionVacio}</div> : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {resultado.productos.map((producto) => (
        <ProductCard key={producto.id} producto={producto} muestraProduccion={muestraProduccion} />
      ))}
    </div>
  );
}
