import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
    // T7 (#13) cerró la deuda: `src/lib/supabase.ts` se retiró del repo, así que el tipo legacy
    // de producto no puede volver. La intención de esta aserción sigue siendo la misma (el
    // catálogo no pasa por el cliente viejo); `admin.test.ts` verifica además que ninguna
    // fuente lo importe.
    expect(() => leer('src/lib/supabase.ts')).toThrow();
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

describe('#22 · el hero tiene foto propia', () => {
  /**
   * La portada era `productos[0]`: el primer producto **por orden alfabético**. Eso ataba la foto
   * del hero a qué producto se llamaba primero —y a que tuviera foto—, así que publicar «Alcohol en
   * Gel» cambiaba la portada y dejarla sin `imagen_url` la mandaba al placeholder. La HU-1 de la
   * spec `front-mvp` pide la identidad institucional en el hero; la foto es decisión de diseño.
   */
  it('la Home usa el asset de la identidad y no el primer producto del catálogo', () => {
    const home = leer('src/app/page.tsx');
    expect(home).toContain('/hero/portada.jpg');
    expect(home).not.toMatch(/productos\[0\]/);
    expect(home).not.toMatch(/portada\?\./);
  });

  it('el asset del hero existe en `public/`', () => {
    expect(existsSync(join(RAIZ, 'public', 'hero', 'portada.jpg'))).toBe(true);
  });

  it('la foto del hero sigue pasando por el componente que valida la URL', () => {
    // Si el hero dejara de usar `ImagenProducto`, una URL rota volvería a tumbar la Home (#49).
    const home = leer('src/app/page.tsx');
    expect(home).toMatch(/<ImagenProducto[\s\S]*FOTO_DEL_HERO\.url/);
  });
});

describe('HU-3 · forma de pago y datos oficiales de retiro', () => {
  it('renombra Cómo se paga a Forma de pago e informa la logística oficial de retiro', () => {
    const home = leer('src/app/page.tsx');
    expect(home).toContain('Forma de pago');
    expect(home).not.toContain('Cómo se paga');
    expect(home).toContain('Int. Moro 1122, Campana');
    expect(home).toContain('Lunes a Viernes de 8:00 a 17:00 hs');
    expect(home).toContain('Departamento de Química de la E.E.S.T N°1 Luciano Reyes');
  });
});
