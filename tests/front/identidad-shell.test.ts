import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ, archivosFuente, leer } from './ayudantes';

/**
 * F0 · Tokens de identidad y shell compartido (issue #3)
 *
 * El ticket no cambia comportamiento de dominio: unifica de dónde salen los valores de
 * identidad y monta el shell (header + footer) que todas las rutas reutilizan. Lo
 * observable —y por eso lo que se testea— es esa estructura: un solo lugar para los
 * colores, un solo header, un solo footer, y las cinco salidas de navegación.
 */

/**
 * Identidad: cada color se declara una sola vez, como canales RGB, en `globals.css`.
 * El tema de Tailwind y los componentes lo referencian por variable.
 */
const IDENTIDAD = [
  { variable: '--color-accent', canales: '61 140 110' },
  { variable: '--color-bg', canales: '247 247 245' },
  { variable: '--color-text', canales: '28 28 30' },
  { variable: '--color-accent-lt', canales: '232 243 239' },
];

/** Archivos de la app (más el tema) que declaran un valor de identidad. */
function archivosConValor(canales: string): string[] {
  const archivos = [
    ...archivosFuente(join(RAIZ, 'src')),
    join(RAIZ, 'src', 'app', 'globals.css'),
    join(RAIZ, 'tailwind.config.ts'),
  ]
    .filter((archivo) => existsSync(archivo))
    .filter((archivo) => readFileSync(archivo, 'utf8').includes(canales))
    .map((archivo) => relative(RAIZ, archivo).replace(/\\/g, '/'));
  return [...new Set(archivos)];
}

describe('F0 · tokens de identidad', () => {
  it('el tema de Tailwind referencia los colores por variable, no por literal', () => {
    const tema = leer('tailwind.config.ts');
    expect(tema).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(tema).toContain('--color-accent');
    expect(tema).toMatch(/rgb\(var\(/);
  });

  it('los colores de identidad viven solo en globals.css', () => {
    for (const { canales } of IDENTIDAD) {
      expect(archivosConValor(canales)).toEqual(['src/app/globals.css']);
    }
  });

  it('los tokens de identidad están declarados en :root', () => {
    const css = leer('src/app/globals.css');
    for (const { variable, canales } of IDENTIDAD) {
      expect(css).toMatch(new RegExp(`${variable}:\\s*${canales}\\s*;`));
    }
    for (const variable of ['--color-surface', '--color-muted', '--color-border']) {
      expect(css).toMatch(new RegExp(`${variable}:`));
    }
  });

  it('las animaciones respetan prefers-reduced-motion', () => {
    expect(leer('src/app/globals.css')).toMatch(/prefers-reduced-motion/);
  });
});

describe('F0 · shell compartido', () => {
  it('hay un solo header y un solo footer, en el layout raíz', () => {
    const componentes = readdirSync(join(RAIZ, 'src', 'components'));
    expect(componentes.filter((nombre) => /^(Header|Footer|NavBar)\.tsx$/.test(nombre)).sort()).toEqual([
      'Footer.tsx',
      'Header.tsx',
    ]);

    const layout = leer('src/app/layout.tsx');
    expect(layout).toMatch(/<Header\s*\/>/);
    expect(layout).toMatch(/<Footer\s*\/>/);
  });

  it('ninguna página vuelve a montar el shell: Header y Footer salen solo del layout', () => {
    const importadores = [...archivosFuente(join(RAIZ, 'src')), join(RAIZ, 'src', 'app', 'layout.tsx')]
      .filter((archivo) => /from\s+["']@\/components\/(Header|Footer)["']/.test(readFileSync(archivo, 'utf8')))
      .map((archivo) => relative(RAIZ, archivo).replace(/\\/g, '/'));
    expect([...new Set(importadores)]).toEqual(['src/app/layout.tsx']);
  });

  it('el header ofrece las cinco salidas con estado activo y sin selector de idioma', () => {
    const header = leer('src/components/Header.tsx');
    for (const destino of ['Inicio', 'Catálogo', 'Sobre el proyecto', 'Carrito', 'Gestión']) {
      expect(header).toContain(destino);
    }
    expect(header).toMatch(/usePathname/);
    expect(header).not.toMatch(/locales\b|\[lang\]|dictionaries|@\/lib\/i18n/);
  });

  it('los controles de ícono del header tienen nombre accesible', () => {
    const header = leer('src/components/Header.tsx');
    expect(header).toMatch(/aria-label=/);
  });

  it('el footer institucional muestra institución, contacto y accesos en columnas', () => {
    const footer = leer('src/components/Footer.tsx');
    for (const columna of ['Institución', 'Contacto', 'Accesos']) {
      expect(footer).toContain(columna);
    }
    expect(footer).toMatch(/grid/);
    expect(footer).toContain('E.E.S.T N°1 Luciano Reyes');
  });
});
