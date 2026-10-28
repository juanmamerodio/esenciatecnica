import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, leer } from './ayudantes';

/**
 * #40 · La plantilla de spec y su control estructural (issue #29).
 *
 * La plantilla vive en `docs/specs/PLANTILLA.md` y este test la hace valer: recorre los specs y exige
 * las siete secciones canónicas, en orden, y la forma de HU `Como … quiero … para`.
 *
 * Los specs que todavía no la siguen están **nombrados** con su motivo: el retrofit de la tanda del
 * 27-10 es #47 y el resto son documentos que nadie está tocando (la plantilla avanza por contacto, no
 * por barrido). Si un spec arreglado sigue en la lista, el test también falla: la lista no envejece.
 */

const SPECS = join(RAIZ, 'docs', 'specs');

/** Specs que todavía no siguen la plantilla, con el motivo por el que no la siguen. */
const PENDIENTES: Record<string, string> = {
  admin: '#47 · retrofit de la tanda',
  carrito: '#47 · retrofit de la tanda',
  catalogo: '#47 · retrofit de la tanda',
  checkout: '#47 · retrofit de la tanda',
  'detalle-producto': '#47 · retrofit de la tanda',
  remito: '#47 · retrofit de la tanda',
  'sobre-el-proyecto': '#47 · retrofit de la tanda',
  'bd-mvp': 'fuera de la tanda; la plantilla avanza por contacto',
  'front-mvp': 'fuera de la tanda; la plantilla avanza por contacto',
  'migracion-otjph': 'fuera de la tanda; le falta la sección de notas finales',
};

/** Las siete secciones canónicas, en orden. El número puede cambiar; el título no. */
const SECCIONES = [
  'Problema',
  'Solución',
  'Historias',
  'Decisiones de implementación',
  'Decisiones de testing',
  'Fuera de alcance',
  'Notas finales',
];

/** Los `## N. Título` de un spec, en orden de aparición. */
function seccionesDe(spec: string): { titulo: string; posicion: number }[] {
  return [...spec.matchAll(/^##\s+\d+\.\s+([^\n]+)$/gm)].map((encontrado) => ({
    titulo: (encontrado[1] ?? '').replace(/\s+/g, ' ').trim(),
    posicion: encontrado.index ?? 0,
  }));
}

/** Los bloques de HU: los `### HU-…` o, si el spec usa listas, los ítems numerados que abren con «Como». */
function bloquesDeHU(spec: string): string[] {
  const porEncabezado = [...spec.matchAll(/^###\s+(HU-[^\n]*)\n([\s\S]*?)(?=\n#{2,3}\s|\s*$)/gm)].map(
    (encontrado) => encontrado[2] ?? '',
  );
  if (porEncabezado.length > 0) return porEncabezado;

  return [
    ...spec.matchAll(
      /^\s*\d+\.\s+((?:\*\*)?Como\b[\s\S]*?)(?=^\s*\d+\.\s|\n#{2,3}\s|(?![\s\S]))/gm,
    ),
  ].map((encontrado) => encontrado[1] ?? '');
}

function specDe(carpeta: string): string {
  return readFileSync(join(SPECS, carpeta, 'spec.md'), 'utf8');
}

function carpetas(): string[] {
  return readdirSync(SPECS, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .filter((nombre) => {
      try {
        return readFileSync(join(SPECS, nombre, 'spec.md'), 'utf8').length > 0;
      } catch {
        return false;
      }
    })
    .sort();
}

describe('#40 · la plantilla existe y dice lo que hay que escribir', () => {
  const plantilla = leer('docs/specs/PLANTILLA.md');

  it('declara las siete secciones, en orden', () => {
    const posiciones = SECCIONES.map((seccion) => plantilla.indexOf(seccion));
    for (const [indice, seccion] of SECCIONES.entries()) {
      expect(posiciones[indice], `la plantilla no nombra «${seccion}`).toBeGreaterThan(-1);
    }
    for (let indice = 1; indice < posiciones.length; indice += 1) {
      expect(posiciones[indice], `«${SECCIONES[indice]}» aparece antes que la anterior`).toBeGreaterThan(
        posiciones[indice - 1] ?? -1,
      );
    }
  });

  it('declara la forma exacta de una HU', () => {
    expect(plantilla).toMatch(/Como <actor>, quiero <feature>, para <beneficio>/);
    expect(plantilla).toMatch(/Given\/When\/Then/);
  });

  it('no prescribe rutas de archivo ni fragmentos de código', () => {
    expect(plantilla).not.toMatch(/src\/|\.tsx?|\.mjs|`[^`]*\{\{/);
    expect(plantilla).not.toMatch(/```(?:ts|tsx|js|jsx|sql)\b/);
  });

  it('está en español y cabe en una pantalla', () => {
    expect(plantilla).toMatch(/Problema/);
    expect(plantilla.split('\n').length).toBeLessThan(120);
  });

  it('`AGENTS.md` §6.2 linkea la plantilla sin copiarla', () => {
    const agents = leer('AGENTS.md');
    const inicio = agents.indexOf('### 6.2');
    const siguiente = agents.indexOf('\n### ', inicio + 1);
    const seccion = agents.slice(inicio, siguiente === -1 ? undefined : siguiente);

    expect(seccion).toMatch(/PLANTILLA\.md/);
  });
});

describe('#40 · los specs siguen la plantilla', () => {
  const todas = carpetas();

  it('encuentra los specs del repo', () => {
    expect(todas.length).toBeGreaterThan(10);
    expect(todas).toContain('checkout');
  });

  it('cada spec tiene las siete secciones, en orden, salvo los pendientes nombrados', () => {
    for (const carpeta of todas) {
      if (PENDIENTES[carpeta]) continue;

      const secciones = seccionesDe(specDe(carpeta));
      const titulos = secciones.map((seccion) => seccion.titulo);

      for (const [indice, esperada] of SECCIONES.entries()) {
        const encontrada = titulos.findIndex((titulo) => titulo.startsWith(esperada));
        expect(encontrada, `${carpeta}: falta la sección «${esperada}»`).toBeGreaterThan(-1);
        if (indice > 0) {
          const anterior = titulos.findIndex((titulo) => titulo.startsWith(SECCIONES[indice - 1] ?? ''));
          expect(encontrada, `${carpeta}: «${esperada}» va antes que «${SECCIONES[indice - 1]}»`).toBeGreaterThan(anterior);
        }
      }
    }
  });

  it('cada HU enuncia actor y beneficio: `Como … quiero … para`', () => {
    for (const carpeta of todas) {
      if (PENDIENTES[carpeta]) continue;

      const bloques = bloquesDeHU(specDe(carpeta));
      expect(bloques.length, `${carpeta}: no se encontró ninguna HU`).toBeGreaterThan(0);

      for (const bloque of bloques) {
        expect(bloque, `${carpeta}: esta HU no enuncia «Como … quiero … para»: ${bloque.slice(0, 200)}`).toMatch(
          /Como\b[\s\S]{1,160}?quiero\b[\s\S]{1,400}?para\b/i,
        );
      }
    }
  });

  it('la lista de pendientes no envejece: un spec arreglado sale de la lista', () => {
    for (const [carpeta, motivo] of Object.entries(PENDIENTES)) {
      const spec = specDe(carpeta);
      const titulos = seccionesDe(spec).map((seccion) => seccion.titulo);
      const completa = SECCIONES.every((seccion) =>
        titulos.some((titulo) => titulo.startsWith(seccion)),
      );

      expect(completa, `${carpeta} ya sigue la plantilla (${motivo}): sacalo de PENDIENTES`).toBe(false);
    }
  });
});
