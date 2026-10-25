import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ, archivosFuente, leer } from './ayudantes';

/**
 * T0 · Español único (issue #2)
 *
 * El ticket no cambia comportamiento de dominio: retira el andamiaje de i18n y deja
 * los textos en español dentro del código. Lo que sí es observable —y por eso se
 * testea— es la estructura que el ticket promete: no hay rutas por idioma, no hay
 * diccionarios y ningún módulo del front los importa.
 *
 * F0 (#3) renombró `NavBar.tsx` a `Header.tsx`; la aserción sobre la navegación sigue
 * siendo la misma, solo cambió el archivo que la contiene.
 *
 * T7 (#13) reintrodujo un `middleware.ts`, pero **no** para negociar idioma: es la puerta
 * del panel `/admin` (Basic Auth con `ADMIN_PASSWORD`). Por eso `middleware.ts` salió de
 * `RETIRADOS` y en su lugar se verifica lo que T0 sí prohíbe: que el middleware no vuelva a
 * traer `locale`, `i18n`, `negotiator`, `accept-language` ni diccionarios. La existencia, el
 * matcher y la autenticación del panel se cubren en `admin.test.ts`.
 */

/** Artefactos que T0 retira: ninguno debe sobrevivir en el repo. */
const RETIRADOS = [
  'src/app/[lang]',
  'src/dictionaries',
  'src/lib/i18n.ts',
];

/** Rutas posibles del middleware: Next lo resuelve en la raíz de las páginas (`src/`). */
const RUTAS_DEL_MIDDLEWARE = ['src/middleware.ts', 'middleware.ts'];

/** Paquetes que sólo existían para negociar idioma. */
const PAQUETES_DE_I18N = ['@formatjs/intl-localematcher', 'negotiator', '@types/negotiator'];

describe('T0 · Español único', () => {
  it('no conserva las rutas por idioma ni los diccionarios', () => {
    const presentes = RETIRADOS.filter((ruta) => existsSync(join(RAIZ, ruta)));
    expect(presentes).toEqual([]);
  });

  it('el middleware, si existe, no negocia idioma: T7 lo reintrodujo sólo para autenticar', () => {
    const ruta = RUTAS_DEL_MIDDLEWARE.find((candidata) => existsSync(join(RAIZ, candidata)));
    // Sin middleware también se cumple: lo que T0 prohíbe es el andamiaje de i18n.
    if (!ruta) return;

    expect(leer(ruta)).not.toMatch(/locale|i18n|negotiator|accept-language|dictionaries/i);
  });

  it('el manifiesto no declara dependencias de i18n', () => {
    const manifiesto = JSON.parse(leer('package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declaradas = Object.keys({
      ...manifiesto.dependencies,
      ...manifiesto.devDependencies,
    });
    expect(declaradas.filter((nombre) => PAQUETES_DE_I18N.includes(nombre))).toEqual([]);
  });

  it('ningún módulo del front importa diccionarios ni el cargador de idioma', () => {
    const ofensores = archivosFuente(join(RAIZ, 'src'))
      .filter((archivo) => /@\/dictionaries|@\/lib\/i18n/.test(readFileSync(archivo, 'utf8')))
      .map((archivo) => relative(RAIZ, archivo).replace(/\\/g, '/'));
    expect(ofensores).toEqual([]);
  });

  it('ninguna página o layout recibe un segmento de idioma', () => {
    const ofensores = archivosFuente(join(RAIZ, 'src', 'app'))
      .filter((archivo) => /params[^\n]*Promise<\{\s*lang\b/.test(readFileSync(archivo, 'utf8')))
      .map((archivo) => relative(RAIZ, archivo).replace(/\\/g, '/'));
    expect(ofensores).toEqual([]);
  });

  it('la tienda vive en la raíz: el Home no redirige a un prefijo de idioma', () => {
    expect(leer('src/app/page.tsx')).not.toMatch(/redirect\(\s*['"]\/(es|en)/);
  });

  it('el documento declara lang="es" y no hay selector de idioma', () => {
    expect(leer('src/app/layout.tsx')).toMatch(/<html[^>]*lang="es"/);
    const header = leer('src/components/Header.tsx');
    expect(header).not.toMatch(/locales\b|\[lang\]|dictionaries|@\/lib\/i18n/);
  });
});
