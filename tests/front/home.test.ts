import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ, archivosFuente, leer } from './ayudantes';

/**
 * T1 · Home canónica (issue #5) — criterios que se verifican en el código, no en el DOM.
 *
 * El seam de datos (la función pública del catálogo contra PGlite) vive en
 * `catalogo.test.ts`. Acá se cubre lo que el ticket exige del texto y de la estructura:
 * vocabulario del dominio, validación manual del pago, mensajes de estado y ausencia del
 * esquema legacy en todo el camino del catálogo.
 */

/** Archivos que forman el camino del catálogo (lo que el ticket migró). */
const CAMINO_DEL_CATALOGO = [
  'src/app/page.tsx',
  'src/app/catalog/page.tsx',
  'src/app/api/products/route.ts',
  'src/lib/catalogo.ts',
  'src/lib/catalogo-servidor.ts',
  'src/components/ProductCard.tsx',
  'src/components/GrillaProductos.tsx',
  'src/components/ImagenProducto.tsx',
];

describe('T1 · texto de la Home', () => {
  it('no habla de insumos ni de laboratorio: habla de cosmética e higiene de la escuela', () => {
    const home = leer('src/app/page.tsx');
    expect(home).not.toMatch(/reactivo|insumo|\bpH\b|compuestos clínicos|Gemini|\bIA\b|inteligencia artificial/i);
    expect(home).toMatch(/cosmética e higiene/i);
    expect(home).toMatch(/Departamento de Química/);
    expect(home).toMatch(/E\.E\.S\.T N°1 Luciano Reyes/);
    expect(home).toMatch(/7mo año/);
  });

  it('comunica el pago validado a mano y no promete envío ni seguimiento', () => {
    const home = leer('src/app/page.tsx');
    expect(home).toMatch(/Administrador de Química/);
    expect(home).toMatch(/a mano/i);
    expect(home).not.toMatch(/enviamos|llega en|entrega en \d|seguimiento del pedido|En Preparación|Enviado|Entregado/i);
  });

  it('la tienda sin productos tiene su mensaje propio', () => {
    expect(leer('src/app/page.tsx')).toContain('Todavía no hay productos publicados');
  });
});

describe('T1 · estructura del catálogo', () => {
  it('hay una sola card de producto y una sola grilla', () => {
    const componentes = readdirSync(join(RAIZ, 'src', 'components'));
    expect(componentes.filter((nombre) => /^ProductCard\.tsx$/.test(nombre))).toEqual(['ProductCard.tsx']);
    expect(componentes.filter((nombre) => /Grilla.*\.tsx$/.test(nombre))).toEqual(['GrillaProductos.tsx']);
  });

  it('la card de la Home no publica unidades disponibles', () => {
    expect(leer('src/components/ProductCard.tsx')).not.toMatch(/producto\.disponible/);
  });

  it('el camino del catálogo no toca el esquema legacy', () => {
    const ofensores = CAMINO_DEL_CATALOGO.filter((archivo) =>
      /nombre_es|precio_ars|nombre_en|from\(['"]productos['"]\)|categoria.*reactivos/i.test(leer(archivo)),
    );
    expect(ofensores).toEqual([]);
  });

  it('el tipo legacy de producto ya no existe en el cliente viejo', () => {
    const clienteLegacy = leer('src/lib/supabase.ts');
    expect(clienteLegacy).not.toMatch(/export type Producto\b|nombre_es|precio_ars/);
  });

  it('el servicio de productos legacy se retiró: quedó el módulo de catálogo', () => {
    expect(() => leer('src/services/product.service.ts')).toThrow();
    const fuentes = readdirSync(join(RAIZ, 'src', 'lib')).map((nombre) => nombre);
    expect(fuentes).toContain('catalogo.ts');
  });

  it('ninguna fuente importa ya el servicio de productos retirado', () => {
    const ofensores = archivosFuente(join(RAIZ, 'src'))
      .filter((ruta) => /product\.service/.test(readFileSync(ruta, 'utf8')))
      .map((ruta) => relative(RAIZ, ruta));

    expect(ofensores).toEqual([]);
  });
});
