import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import EncabezadoSeccion from "@/components/EncabezadoSeccion";
import GrillaProductos from "@/components/GrillaProductos";
import { leerCatalogo } from "@/lib/catalogo-servidor";

// El catálogo cambia con el stock: no se cachea una foto vieja de la tienda.
export const dynamic = "force-dynamic";

type Busqueda = { q?: string; categoria?: string };

/** La URL es el estado del filtro: se puede compartir y el "atrás" funciona. */
function urlDelFiltro(q: string, categoria: string): string {
  const parametros = new URLSearchParams();
  if (q.trim()) parametros.set("q", q.trim());
  if (categoria) parametros.set("categoria", categoria);

  const consulta = parametros.toString();
  return consulta ? `/catalog?${consulta}` : "/catalog";
}

/** Chip de categoría: el activo se marca por color y por `aria-current` (HU-2). */
function ChipCategoria({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "true" : undefined}
      className={`rounded-pill border px-5 py-2 text-sm font-medium transition-colors ${
        activo
          ? "border-accent bg-accent text-surface"
          : "border-border bg-surface text-muted hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { q = "", categoria = "" } = await searchParams;
  const resultado = await leerCatalogo({ busqueda: q, categoria: categoria || undefined });

  const hayConsulta = Boolean(q.trim() || categoria);
  const categorias = resultado.estado === "ok" ? resultado.categorias : [];
  const cantidad = resultado.estado === "ok" ? resultado.productos.length : 0;

  return (
    <div className="space-y-10 pb-20">
      <EncabezadoSeccion
        titulo="Catálogo de productos"
        subtitulo="Cosmética e higiene elaboradas por el Departamento de Química. Los precios están expresados en pesos argentinos."
      />

      <form action="/catalog" method="get" role="search" className="flex flex-wrap items-center gap-3">
        {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <label htmlFor="busqueda" className="sr-only">
            Buscar productos por nombre, categoría, tipo o descripción
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <input
            id="busqueda"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Buscar por nombre, categoría o descripción…"
            className="w-full rounded-pill border border-border bg-surface py-3 pl-11 pr-4 text-sm text-text outline-none placeholder:text-muted"
          />
        </div>
        <button type="submit" className="btn-primary py-3 text-sm">
          Buscar
        </button>
        {/* Limpiar la búsqueda conserva la categoría (HU-3). */}
        {q.trim() ? (
          <Link href={urlDelFiltro("", categoria)} className="btn-secondary gap-2 py-3 text-sm">
            <X aria-hidden className="h-4 w-4" />
            Limpiar búsqueda
          </Link>
        ) : null}
      </form>

      {categorias.length > 0 ? (
        <nav aria-label="Filtrar por categoría" className="flex flex-wrap gap-2">
          <ChipCategoria href={urlDelFiltro(q, "")} activo={!categoria}>
            Todos
          </ChipCategoria>
          {categorias.map((nombre) => (
            <ChipCategoria key={nombre} href={urlDelFiltro(q, nombre)} activo={categoria === nombre}>
              {nombre}
            </ChipCategoria>
          ))}
        </nav>
      ) : null}

      {cantidad > 0 ? (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
          {cantidad} {cantidad === 1 ? "producto" : "productos"}
        </p>
      ) : null}

      <GrillaProductos
        resultado={resultado}
        mensajeVacio={hayConsulta ? "Sin resultados para tu búsqueda" : "Todavía no hay productos publicados"}
        detalleVacio={
          hayConsulta
            ? "Probá con otro término o elegí otra categoría."
            : "La tienda se llena a medida que el Departamento de Química publica sus elaboraciones."
        }
        accionVacio={
          hayConsulta ? (
            <Link href="/catalog" className="btn-secondary gap-2">
              Ver el catálogo completo
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          ) : null
        }
      />
    </div>
  );
}
