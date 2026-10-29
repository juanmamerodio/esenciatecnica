import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ, archivosFuente, leer } from './ayudantes';

/**
 * La tienda no prefetchea el panel (bug de la entrada a `/admin`).
 *
 * `/admin` está detrás de Basic Auth: el middleware contesta `401` con `WWW-Authenticate`
 * (`src/middleware.ts`, ADR 0005). Un `<Link>` de Next prefetchea en cuanto entra al viewport, y
 * `prefetch={false}` **no** apaga el de hover (`next/dist/client/link.js:329` gatea el de viewport;
 * el `onMouseEnter` de `:381` prefetchea siempre). Ese prefetch es una petición a `/admin`, así que
 * el navegador recibía el reto y abría el diálogo de usuario y contraseña **en la tienda**.
 *
 * Por eso la entrada al panel se hace con navegación de documento: el reto aparece cuando alguien
 * pide el panel, no cuando abre la tienda ni cuando el mouse pasa cerca del botón.
 */

const SHELL = ['src/components/Header.tsx', 'src/components/Footer.tsx'];

/** El panel se arma en sus propios archivos; el resto es la tienda. */
const DEL_PANEL = /^src\/(app\/admin|components\/admin)\//;

/** Tags `<Link>` que apuntan al panel: son los que disparan el prefetch. */
function enlacesAlPanel(fuente: string): string[] {
  return [...fuente.matchAll(/<Link\b[^>]*>/g)]
    .map((tag) => tag[0])
    .filter((tag) => tag.includes('/admin'));
}

/** Archivos de la tienda, sin los del panel, con su ruta relativa. */
function archivosDeLaTienda(): string[] {
  return archivosFuente(join(RAIZ, 'src'))
    .map((archivo) => relative(RAIZ, archivo).replace(/\\/g, '/'))
    .filter((ruta) => !DEL_PANEL.test(ruta));
}

describe('la tienda no prefetchea el panel', () => {
  it('ninguna ruta de la tienda arma la entrada al panel con <Link>', () => {
    const ofensores = archivosDeLaTienda().filter((ruta) => enlacesAlPanel(leer(ruta)).length > 0);
    expect(ofensores).toEqual([]);
  });

  it('el header entra al panel con navegación de documento, no con <Link>', () => {
    const header = leer(SHELL[0]);
    expect(header).toMatch(/<a\b[^>]*href="\/admin"/);
    expect(header).toContain('Gestión');
    // La entrada al panel conserva su estado activo.
    expect(header).toMatch(/esRutaActiva\(pathname, "\/admin"\)/);
  });

  it('el footer entra al panel con navegación de documento, fuera de la lista de <Link>', () => {
    const footer = leer(SHELL[1]);
    expect(footer).toMatch(/<a\b[^>]*href="\/admin"/);
    // La lista que se mapea a `<Link>` (ACCESOS) no puede volver a incluir el panel.
    expect(footer).not.toMatch(/href:\s*"\/admin"/);
  });
});
