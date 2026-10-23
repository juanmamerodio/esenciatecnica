"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, ShoppingCart, ShieldCheck } from "lucide-react";

/**
 * Shell de navegación: una sola fuente para todas las rutas (issue #3).
 * Estado activo por ruta, sin selector de idioma y con las cinco salidas del MVP.
 */
const DESTINOS = [
  { nombre: "Inicio", href: "/" },
  { nombre: "Catálogo", href: "/catalog" },
  { nombre: "Sobre el proyecto", href: "/about" },
] as const;

function esRutaActiva(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="shell-header fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Esencia Técnica · Inicio"
          className="flex shrink-0 items-center gap-2 rounded-2xl"
        >
          <FlaskConical aria-hidden className="h-6 w-6 text-accent" strokeWidth={2.5} />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-base font-bold tracking-tight text-text">Esencia Técnica</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              E.E.S.T N°1 Luciano Reyes
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2"
        >
          {DESTINOS.map((destino) => (
            <Link
              key={destino.href}
              href={destino.href}
              className="nav-pill"
              aria-current={esRutaActiva(pathname, destino.href) ? "page" : undefined}
            >
              {destino.nombre}
            </Link>
          ))}

          <Link
            href="/cart"
            className="nav-pill gap-2"
            aria-current={esRutaActiva(pathname, "/cart") ? "page" : undefined}
            aria-label="Carrito"
          >
            <ShoppingCart aria-hidden className="h-4 w-4" />
            Carrito
            {/* T4 reemplaza el 0 fijo por el contenido real del carrito. */}
            <span className="min-w-[1.25rem] rounded-full bg-accent px-1.5 text-center font-mono text-[10px] font-bold text-surface">
              0
            </span>
          </Link>
        </nav>

        <Link
          href="/admin"
          className="nav-pill shrink-0 gap-2 border border-border"
          aria-current={esRutaActiva(pathname, "/admin") ? "page" : undefined}
        >
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Gestión
        </Link>
      </div>
    </header>
  );
}
