import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Footer institucional en columnas: institución, contacto y accesos (issue #3).
 *
 * El panel **no** está en esta lista: se mapea a `<Link>`, y el prefetch del Link pediría
 * `/admin` en segundo plano, con el `401` de Basic Auth abriendo el diálogo en la tienda
 * (ADR 0005 · consecuencias). Su entrada lleva navegación de documento, más abajo.
 */
const ACCESOS = [
  { nombre: "Catálogo", href: "/catalog" },
  { nombre: "Sobre el proyecto", href: "/about" },
  { nombre: "Carrito", href: "/cart" },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border-soft bg-surface/60">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="flex items-center gap-2 font-bold tracking-tight text-accent">
            <Sparkles aria-hidden className="h-5 w-5" />
            Esencia Técnica
          </p>
          <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted">
            Cosmética e higiene elaboradas por el Departamento de Química. Proyecto educativo de 7mo año
            de la E.E.S.T N°1 Luciano Reyes.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text">Institución</h2>
          <p className="mt-4 text-sm text-muted">E.E.S.T N°1 Luciano Reyes</p>
          <p className="mt-1 text-sm text-muted">Campana, Buenos Aires</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text">Contacto</h2>
          <a
            href="mailto:proyectos@esenciatecnica.edu.ar"
            className="mt-4 block text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            proyectos@esenciatecnica.edu.ar
          </a>
          <p className="mt-4">
            <span className="chip">Ciclo Lectivo 2026</span>
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text">Accesos</h2>
          <ul className="mt-4 space-y-2">
            {ACCESOS.map((acceso) => (
              <li key={acceso.href}>
                <Link
                  href={acceso.href}
                  className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
                >
                  {acceso.nombre}
                </Link>
              </li>
            ))}
            <li>
              {/* El panel, con navegación de documento: su `401` es un reto de Basic Auth. */}
              <a
                href="/admin"
                className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
              >
                Gestión (admin)
              </a>
            </li>
          </ul>
        </div>
      </div>

      <p className="border-t border-border-soft py-6 text-center text-xs text-muted">
        © 2026 Esencia Técnica · E.E.S.T N°1 Luciano Reyes · Departamento de Química
      </p>
    </footer>
  );
}
