"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingCart, ShieldCheck, Sparkles } from "lucide-react";
import { totalUnidades } from "@/lib/carrito";
import { useCartStore } from "@/lib/store";

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
  const unidades = useCartStore((estado) => totalUnidades(estado.items));
  const [montado, setMontado] = useState(false);

  // El carrito vive en localStorage: hasta hidratar, el contador no puede afirmar nada.
  useEffect(() => setMontado(true), []);
  const contador = montado ? unidades : 0;

  return (
    <header className="shell-header fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Esencia Técnica · Inicio"
          className="flex shrink-0 items-center gap-2 rounded-2xl"
        >
          <Sparkles aria-hidden className="h-6 w-6 text-accent" strokeWidth={2.5} />
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
          >
            <ShoppingCart aria-hidden className="h-4 w-4" />
            Carrito
            <span
              aria-hidden
              className="min-w-[1.25rem] rounded-full bg-accent px-1.5 text-center font-mono text-[10px] font-bold text-surface"
            >
              {contador}
            </span>
            <span className="sr-only">
              {contador === 1 ? "1 unidad en el carrito" : `${contador} unidades en el carrito`}
            </span>
          </Link>
        </nav>

        {/*
          El panel se entra con navegación de documento, no con `<Link>`: el prefetch del Link
          pide `/admin` en segundo plano y el `401` con `WWW-Authenticate` del middleware abría
          el diálogo de Basic Auth en la tienda (ADR 0005 · consecuencias).
        */}
        <a
          href="/admin"
          className="nav-pill shrink-0 gap-2 border border-border"
          aria-current={esRutaActiva(pathname, "/admin") ? "page" : undefined}
        >
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Gestión
        </a>
      </div>
    </header>
  );
}
